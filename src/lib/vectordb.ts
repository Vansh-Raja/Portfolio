import { Document } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

// ============================================================================
// Configuration
// ============================================================================

const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID || "";
const openaiApiKey = process.env.OPENAI_API_KEY || "";

if (!vectorStoreId) {
  console.warn(
    "Warning: OPENAI_VECTOR_STORE_ID is not set. Vector search will not work.",
  );
}

// ============================================================================
// OpenAI Vector Store Search (Direct API Call)
// ============================================================================

export interface SearchResult {
  fileId: string;
  filename: string;
  score: number;
  content: string;
}

interface VectorStoreSearchResponse {
  object: string;
  search_query: string;
  data: Array<{
    file_id: string;
    filename: string;
    score: number;
    attributes: Record<string, string>;
    content: Array<{
      type: string;
      text?: string;
    }>;
  }>;
  has_more: boolean;
  next_page: string | null;
}

/**
 * Search the OpenAI Vector Store for relevant content
 * Uses direct API call since the SDK version may not have the search method
 */
export async function searchVectorStore(
  query: string,
  maxResults: number = 5,
): Promise<SearchResult[]> {
  if (!vectorStoreId) {
    console.warn("Vector store ID not configured, returning empty results");
    return [];
  }

  if (!openaiApiKey) {
    console.warn("OpenAI API key not configured, returning empty results");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.openai.com/v1/vector_stores/${vectorStoreId}/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify({
          query,
          max_num_results: maxResults,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Vector store search failed: ${response.status} ${errorText}`,
      );
      return [];
    }

    const data: VectorStoreSearchResponse = await response.json();
    const results: SearchResult[] = [];

    for (const result of data.data) {
      // Extract text content from the result
      let content = "";
      if (result.content && Array.isArray(result.content)) {
        for (const contentPart of result.content) {
          if (contentPart.type === "text" && contentPart.text) {
            content += contentPart.text + "\n";
          }
        }
      }

      results.push({
        fileId: result.file_id,
        filename: result.filename,
        score: result.score,
        content: content.trim(),
      });
    }

    return results;
  } catch (error) {
    console.error("Vector store search failed:", error);
    return [];
  }
}

// ============================================================================
// LangChain Retriever Wrapper
// ============================================================================

export interface OpenAIVectorStoreRetrieverInput extends BaseRetrieverInput {
  maxResults?: number;
}

/**
 * A LangChain-compatible retriever that uses OpenAI Vector Store search
 */
export class OpenAIVectorStoreRetriever extends BaseRetriever {
  lc_namespace = ["langchain", "retrievers", "openai_vector_store"];

  private maxResults: number;

  constructor(fields?: OpenAIVectorStoreRetrieverInput) {
    super(fields);
    this.maxResults = fields?.maxResults ?? 5;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const results = await searchVectorStore(query, this.maxResults);

    return results.map(
      (result) =>
        new Document({
          pageContent: result.content,
          metadata: {
            fileId: result.fileId,
            filename: result.filename,
            score: result.score,
            // Extract URL from content if present (our upload format includes "URL: /path")
            url: extractUrlFromContent(result.content),
          },
        }),
    );
  }
}

/**
 * Extract URL from document content (our format includes "URL: /path" at the start)
 */
function extractUrlFromContent(content: string): string {
  const match = content.match(/^URL:\s*(\S+)/m);
  return match ? match[1] : "";
}

/**
 * Get a retriever instance for use with LangChain chains
 */
export function getRetriever(
  maxResults: number = 5,
): OpenAIVectorStoreRetriever {
  return new OpenAIVectorStoreRetriever({ maxResults });
}
