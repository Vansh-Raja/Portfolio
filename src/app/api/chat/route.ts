import { getRetriever } from "@/lib/vectordb";
import { UpstashRedisCache } from "@langchain/community/caches/upstash_redis";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { Redis } from "@upstash/redis";
import { LangChainStream, Message, StreamingTextResponse } from "ai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createRetrievalChain } from "langchain/chains/retrieval";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;

    const latestMessage = messages[messages.length - 1].content;

    const { stream, handlers } = LangChainStream();

    // Try to set up Redis cache — skip if env vars are missing or Redis is unreachable
    let cache: UpstashRedisCache | undefined;
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      try {
        cache = new UpstashRedisCache({ client: Redis.fromEnv() });
      } catch {
        console.warn("Redis cache init failed, proceeding without cache");
      }
    }

    const chatModel = new ChatOpenAI({
      model: "gpt-4o-mini",
      streaming: true,
      callbacks: [handlers],
      verbose: true, // logs to console
      ...(cache && { cache }),
    });

    const rephraseModel = new ChatOpenAI({
      model: "gpt-4o-mini",
      verbose: true,
      ...(cache && { cache }),
    });

    // Use the new OpenAI Vector Store retriever
    const retriever = getRetriever(5);

    // get a customised prompt based on chat history
    const chatHistory = messages
      .slice(0, -1) // ignore latest message
      .map((msg: Message) =>
        msg.role === "user"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content),
      );

    const rephrasePrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
      [
        "user",
        "Given the above conversation history, generate a search query to look up information relevant to the current question. " +
          "Do not leave out any relevant keywords. " +
          "Only return the query and no other text. ",
      ],
    ]);

    const historyAwareRetrievalChain = await createHistoryAwareRetriever({
      llm: rephraseModel,
      retriever,
      rephrasePrompt,
    });

    // final prompt
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are Vansh Support, a friendly chatbot for Vansh's personal developer portfolio website. " +
          "You are trying to convince potential employers to hire Vansh as a software developer. " +
          "Be concise and only answer the user's questions based on the provided context below. " +
          "Provide links to pages that contains relevant information about the topic from the given context. " +
          "Format your messages in markdown.\n\n" +
          "When providing links to pages on this site, always use relative URLs (e.g., /projects) instead of full domains. This ensures links work on both localhost and production.\n\n" +
          "Only reference the following pages when providing links, and do not invent new ones. " +
          "If the user asks about education/resume/grades, link to the Resume only (do NOT mention an Education page).\n" +
          "- Home: /\n" +
          "- Projects: /projects\n" +
          "- Blog: /blog\n" +
          "- Contact: /contact\n" +
          "- Privacy Policy: /privacy\n" +
          "- Resume: /VanshRaja_Resume.pdf\n\n" +
          "Context:\n{context}",
      ],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
    ]);

    const combineDocsChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt,
      documentPrompt: PromptTemplate.fromTemplate(
        "Page content:\n{page_content}",
      ),
      documentSeparator: "\n------\n",
    });

    // 1. retrievalChain converts the {input} into a vector
    // 2. do a similarity search in the vector store and finds relevant documents
    // 3. pairs the documents to createStuffDocumentsChain and put into {context}
    // 4. send the updated prompt to chatgpt for a customised response

    const retrievalChain = await createRetrievalChain({
      combineDocsChain,
      retriever: historyAwareRetrievalChain, // get the relevant documents based on chat history
    });

    retrievalChain.invoke({
      input: latestMessage,
      chat_history: chatHistory,
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
