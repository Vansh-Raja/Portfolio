import { searchVectorStore } from "@/lib/vectordb";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";

export const maxDuration = 30;

const MODEL = "gpt-5-nano";

const SYSTEM_PROMPT =
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
  "Context:\n";

function messageText(message: Message): string {
  return typeof message.content === "string" ? message.content : "";
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      return Response.json({ error: "Chat is not configured" }, { status: 500 });
    }

    const body = await req.json();
    const messages: Message[] = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "No prompt provided." }, { status: 400 });
    }

    const latestMessage = messageText(messages[messages.length - 1]).trim();
    if (!latestMessage) {
      return Response.json({ error: "No prompt provided." }, { status: 400 });
    }

    const priorUserText = messages
      .slice(0, -1)
      .filter((msg) => msg.role === "user")
      .map(messageText)
      .filter(Boolean)
      .slice(-2);
    const searchQuery = [...priorUserText, latestMessage].join(" ");

    const results = await searchVectorStore(searchQuery, 5);
    const context = results
      .map((result) => result.content)
      .filter(Boolean)
      .join("\n------\n");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // gpt-5-nano defaults to heavy hidden reasoning (can exceed 60s and Vercel timeouts).
    const response = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      reasoning_effort: "minimal",
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}${context}` },
        ...messages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: messageText(msg),
        })),
      ],
    } as OpenAI.Chat.ChatCompletionCreateParamsStreaming);

    return new StreamingTextResponse(OpenAIStream(response));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
