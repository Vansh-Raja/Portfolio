import dotenv from "dotenv";
dotenv.config({ path: ".env" });

// Check if embedding generation should be skipped
if (process.env.SKIP_EMBEDDINGS === "true") {
  console.log("Skipping embedding generation due to SKIP_EMBEDDINGS=true");
  process.exit(0);
}

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

// Advanced retry function with exponential backoff and jitter
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    jitter?: boolean;
    context?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 5,
    baseDelay = 2000,
    maxDelay = 30000,
    jitter = true,
    context = "operation"
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) {
        console.error(`❌ ${context} failed after ${maxRetries + 1} attempts:`, error.message);
        throw error;
      }
      
      // Check if it's a database resuming error (AstraDB specific)
      const isDatabaseResuming = error?.status === 503 && 
        (error?.body?.includes("Resuming your database") || 
         error?.message?.includes("Resuming your database"));
      
      // Check if it's a timeout or network error
      const isRetryableError = isDatabaseResuming || 
        error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT' ||
        error?.status >= 500 ||
        error?.message?.includes('timeout');

      if (!isRetryableError) {
        console.error(`❌ ${context} failed with non-retryable error:`, error.message);
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(maxDelay, Math.pow(2, attempt) * baseDelay);
      
      // Add jitter to prevent thundering herd problem
      if (jitter) {
        delay = delay * (0.5 + Math.random());
      }

      if (isDatabaseResuming) {
        console.log(`⏳ Database is resuming, retrying ${context} in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
      } else {
        console.log(`🔄 Retrying ${context} in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Max retries exceeded for ${context}`);
}

// Timeout wrapper for operations
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

async function generateEmbeddings() {
  console.log("🚀 Starting embedding generation...");
  
  try {
    // Initialize vector store with retry and timeout
    const vectorStore = await retryWithBackoff(
      () => withTimeout(getVectorStore(), 30000, "Vector store initialization"),
      { context: "Vector store initialization" }
    );
    console.log("✅ Successfully connected to vector store");

    // Clear existing data with retry
    const collection = await retryWithBackoff(
      () => getEmbeddingsCollection(),
      { context: "Get embeddings collection" }
    );
    
    await retryWithBackoff(
      () => withTimeout(collection.deleteMany({}), 15000, "Clear collection"),
      { context: "Clear existing embeddings" }
    );
    
    const redis = Redis.fromEnv();
    await retryWithBackoff(
      () => withTimeout(redis.flushdb(), 10000, "Clear Redis"),
      { context: "Clear Redis cache" }
    );
    
    console.log("🧹 Cleared existing embeddings and cache");

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
       await retryWithBackoff(
         () => withTimeout(vectorStore.addDocuments(careerSummaryDoc), 20000, "Add career summary"),
         { context: "Add career summary embeddings" }
       );
       console.log("✅ Added career summary embeddings");
     } catch (e) {
       console.error("❌ Failed to generate career summary for embedding", e);
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
       await retryWithBackoff(
         () => withTimeout(vectorStore.addDocuments(techSummaryDoc), 20000, "Add technologies summary"),
         { context: "Add technologies summary embeddings" }
       );
       console.log("✅ Added technologies summary embeddings");
     } catch (e) {
       console.error("❌ Failed to generate technologies summary for embedding", e);
     }

              // Add all documents with retry and timeout
     await retryWithBackoff(
       () => withTimeout(vectorStore.addDocuments(splitRoutes), 30000, "Add routes"),
       { context: "Add route embeddings" }
     );
     console.log("✅ Added route embeddings");
     
     await retryWithBackoff(
       () => withTimeout(vectorStore.addDocuments(splitData), 30000, "Add data"),
       { context: "Add data embeddings" }
     );
     console.log("✅ Added data embeddings");
     
     await retryWithBackoff(
       () => withTimeout(vectorStore.addDocuments(splitPosts), 30000, "Add posts"),
       { context: "Add post embeddings" }
     );
     console.log("✅ Added post embeddings");
     
     await retryWithBackoff(
       () => withTimeout(vectorStore.addDocuments(sitePagesDoc), 15000, "Add site pages"),
       { context: "Add site pages embeddings" }
     );
     console.log("✅ Added site pages embeddings");
     
     await retryWithBackoff(
       () => withTimeout(vectorStore.addDocuments(technologiesDoc), 15000, "Add technologies"),
       { context: "Add technologies embeddings" }
     );
     console.log("✅ Added technologies embeddings");
     
     console.log("🎉 Embedding generation completed successfully!");
  } catch (error: any) {
    console.error("Embedding generation failed:", error);
    process.exit(1);
  }
}

generateEmbeddings().catch((error) => {
  console.error("❌ Failed to generate embeddings:", error.message);
  
  // Check for specific AstraDB errors
  const isDatabaseResuming = error?.status === 503 && 
    (error?.body?.includes("Resuming your database") || 
     error?.message?.includes("Resuming your database"));
  
  const isTimeout = error?.message?.includes("timed out");
  const isConnectionError = error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT';
  
  if (isDatabaseResuming) {
    console.log("\n⚠️  AstraDB is currently resuming from sleep mode.");
    console.log("   This is normal behavior for serverless databases.");
    console.log("   The build will continue without fresh embeddings.");
    console.log("   Your chatbot may use cached data until the next successful build.\n");
    process.exit(0); // Exit successfully so build continues
  }
  
  if (isTimeout || isConnectionError) {
    console.log("\n⚠️  Database connection timed out or failed.");
    console.log("   This could be due to network issues or database maintenance.");
    console.log("   The build will continue without fresh embeddings.\n");
    process.exit(0); // Exit successfully so build continues
  }
  
  // For other errors, exit with failure
  console.error("❌ Build failed due to embedding generation error.");
  console.error("   If this persists, consider setting SKIP_EMBEDDINGS=true");
  process.exit(1);
});
