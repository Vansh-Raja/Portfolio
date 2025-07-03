import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { DocumentInterface } from "@langchain/core/documents";
import { Redis } from "@upstash/redis";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getEmbeddingsCollection, getVectorStore } from "../src/lib/vectordb";
import fs from "fs";

// Utility to convert absolute links to relative (for internal links)
function toRelativeLinks(content: string): string {
  // Replace any links to your domain with relative links
  return content.replace(/https?:\/\/(vanshraja\.me|yourportfolio\.com)(\/\w+)/g, '$2');
}

async function generateEmbeddings() {
  const vectorStore = await getVectorStore();

  // clear existing data
  (await getEmbeddingsCollection()).deleteMany({});
  (await Redis.fromEnv()).flushdb();

  const routeLoader = new DirectoryLoader(
    "src/app",
    {
      ".tsx": (path) => new TextLoader(path),
    },
    true,
  );

  // routes
  const routes = (await routeLoader.load())
    .filter((route) => route.metadata.source.endsWith("page.tsx"))
    .map((route): DocumentInterface => {
      const url =
        route.metadata.source
          .replace(/\\/g, "/") // replace "\\" with "/"
          .split("/src/app")[1]
          .split("/page.tsx")[0] || "/";

      let pageContentTrimmed = route.pageContent
        .replace(/^import.*$/gm, "") // remove all import statements
        .replace(/ className=(\["']).*?\1| className={.*?}/g, "") // remove all className props
        .replace(/^\s*[\r]/gm, "") // remove empty lines
        .trim();
      // Convert absolute links to relative
      pageContentTrimmed = toRelativeLinks(pageContentTrimmed);

      return { pageContent: pageContentTrimmed, metadata: { url } };
    });

  // console.log(routes);

  const routesSplitter = RecursiveCharacterTextSplitter.fromLanguage("html");
  const splitRoutes = await routesSplitter.splitDocuments(routes);

  // resume data
  const dataLoader = new DirectoryLoader("src/data", {
    ".json": (path) => new TextLoader(path),
  });

  const data = await dataLoader.load();

  // console.log(data);

  const dataSplitter = RecursiveCharacterTextSplitter.fromLanguage("js");
  const splitData = await dataSplitter.splitDocuments(data);

  // blog posts
  const postLoader = new DirectoryLoader(
    "content",
    {
      ".mdx": (path) => new TextLoader(path),
    },
    true,
  );

  const posts = (await postLoader.load())
    .filter((post) => post.metadata.source.endsWith(".mdx"))
    .map((post): DocumentInterface => {
      let pageContentTrimmed = post.pageContent.split("---")[1]; // only want the frontmatter
      // Convert absolute links to relative
      pageContentTrimmed = toRelativeLinks(pageContentTrimmed);
      return { pageContent: pageContentTrimmed, metadata: post.metadata };
    });

  // console.log(posts);

  const postSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown");
  const splitPosts = await postSplitter.splitDocuments(posts);

  // Embed site-pages.json so the chatbot knows all available pages
  const sitePagesRaw = fs.readFileSync("src/data/site-pages.json", "utf-8");
  const sitePagesDoc = [{
    pageContent: sitePagesRaw,
    metadata: { url: "/site-pages.json" }
  }];

  // Embed technologies.json so the chatbot knows Vansh's skills
  const technologiesRaw = fs.readFileSync("src/data/technologies.json", "utf-8");
  const technologiesDoc = [{
    pageContent: technologiesRaw,
    metadata: { url: "/technologies.json" }
  }];

  // Embed a plain-English summary of work experience for the chatbot
  try {
    const careerData = JSON.parse(fs.readFileSync("src/data/career.json", "utf-8"));
    let summary = "Vansh's Work Experience:\n\n";
    for (const job of careerData.career) {
      summary += `- ${job.title} at ${job.name} (${job.start} – ${job.end})\n`;
      if (job.description && job.description.length > 0) {
        for (const line of job.description) {
          summary += `  • ${line}\n`;
        }
      }
    }
    const careerSummaryDoc = [{
      pageContent: summary,
      metadata: { url: "/career-summary.txt" }
    }];
    await vectorStore.addDocuments(careerSummaryDoc);
  } catch (e) {
    console.error("Failed to generate career summary for embedding", e);
  }

  // Generate and embed a plain-English summary of technologies for the chatbot
  try {
    const techData = JSON.parse(technologiesRaw);
    let summary = "Vansh's Technologies and Skills:\n\n";
    if (techData.technologies.primary) {
      summary += "Primary Technologies: " + techData.technologies.primary.map((t: any) => t.name).join(", ") + "\n\n";
    }
    if (techData.technologies.additional) {
      summary += "Additional Experience:\n";
      for (const group of techData.technologies.additional) {
        summary += `- ${group.label}: ${group.items.join(", ")}` + "\n";
      }
    }
    const techSummaryDoc = [{
      pageContent: summary,
      metadata: { url: "/technologies-summary.txt" }
    }];
    await vectorStore.addDocuments(techSummaryDoc);
  } catch (e) {
    console.error("Failed to generate technologies summary for embedding", e);
  }

  await vectorStore.addDocuments(splitRoutes);
  await vectorStore.addDocuments(splitData);
  await vectorStore.addDocuments(splitPosts);
  await vectorStore.addDocuments(sitePagesDoc);
  await vectorStore.addDocuments(technologiesDoc);
}

generateEmbeddings();
