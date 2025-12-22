import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import crypto from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

// ============================================================================
// Configuration
// ============================================================================

const VECTOR_STORE_NAME = "vansh-portfolio-knowledge-base";

// IMPORTANT: Persist manifest across Vercel builds using build cache.
// Vercel restores `.vercel/cache` between deployments, while the repo workspace
// is a fresh clone each time.
const MANIFEST_PATH = process.env.VERCEL
  ? path.join(
      process.cwd(),
      ".vercel",
      "cache",
      "openai-vector-store-manifest.json",
    )
  : path.join(process.cwd(), ".vector-store-manifest.json");
const CONTENT_DIR = path.join(process.cwd(), "content");
const DATA_DIR = path.join(process.cwd(), "src/data");
const APP_DIR = path.join(process.cwd(), "src/app");

// Check if embedding generation should be skipped
if (process.env.SKIP_EMBEDDINGS === "true") {
  console.log("Skipping embedding generation due to SKIP_EMBEDDINGS=true");
  process.exit(0);
}

// ============================================================================
// Types
// ============================================================================

interface ManifestEntry {
  openaiFileId: string;
  sha256: string;
  url: string;
  kind: string;
}

interface Manifest {
  vectorStoreId: string;
  files: Record<string, ManifestEntry>; // keyed by sourceId
}

interface ContentDocument {
  sourceId: string;
  content: string;
  url: string;
  kind: "route" | "data" | "blog" | "summary";
  filename: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function toRelativeLinks(content: string): string {
  return content.replace(
    /https?:\/\/(vanshraja\.me|yourportfolio\.com)(\/\w+)/g,
    "$2",
  );
}

function getChangedFiles(): Set<string> | null {
  try {
    // Get the merge base with main/master to find changed files
    let baseBranch = "main";
    try {
      execSync("git rev-parse --verify main", { stdio: "ignore" });
    } catch {
      try {
        execSync("git rev-parse --verify master", { stdio: "ignore" });
        baseBranch = "master";
      } catch {
        // No main/master branch, probably first commit
        return null;
      }
    }

    // Check if we're on the base branch itself
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();

    let diffCommand: string;
    if (currentBranch === baseBranch) {
      // On main/master: compare with last commit
      diffCommand = "git diff --name-only HEAD~1 HEAD 2>/dev/null || echo ''";
    } else {
      // On feature branch: compare with base branch
      diffCommand = `git diff --name-only ${baseBranch}...HEAD`;
    }

    const output = execSync(diffCommand, { encoding: "utf8" });
    const files = output
      .split("\n")
      .filter((f) => f.trim().length > 0)
      .map((f) => path.resolve(process.cwd(), f));

    return new Set(files);
  } catch (error) {
    console.log("Could not detect git changes, will use hash-based diffing");
    return null;
  }
}

function getImpactedSourceIdsFromGitChangedFiles(
  gitChangedFiles: Set<string> | null,
): Set<string> | null {
  if (!gitChangedFiles) {
    return null;
  }

  const impacted = new Set<string>();

  for (const absPath of Array.from(gitChangedFiles)) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, "/");

    // Blog posts
    if (relPath.startsWith("content/") && relPath.endsWith(".mdx")) {
      const slug = path.basename(relPath, ".mdx");
      impacted.add(`blog:${slug}`);
      continue;
    }

    // Data files + derived summaries
    if (relPath.startsWith("src/data/") && relPath.endsWith(".json")) {
      const filename = path.basename(relPath);
      impacted.add(`data:${filename}`);

      if (filename === "career.json") {
        impacted.add("summary:career");
      }
      if (filename === "technologies.json") {
        impacted.add("summary:technologies");
      }
      if (filename === "site-pages.json") {
        impacted.add("summary:site-pages");
      }
      continue;
    }

    // Route pages
    if (relPath.startsWith("src/app/") && relPath.endsWith("page.tsx")) {
      const url =
        relPath.replace("src/app", "").replace("/page.tsx", "") || "/";
      impacted.add(`route:${url}`);
      continue;
    }
  }

  return impacted;
}

function loadManifest(): Manifest | null {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    }
  } catch {
    console.log("Could not load manifest, starting fresh");
  }
  return null;
}

function saveManifest(manifest: Manifest): void {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

// ============================================================================
// Content Collection Functions
// ============================================================================

function collectRoutes(): ContentDocument[] {
  const documents: ContentDocument[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name === "page.tsx") {
        const content = fs.readFileSync(fullPath, "utf8");
        const relativePath = fullPath.replace(APP_DIR, "").replace(/\\/g, "/");
        const url = relativePath.replace("/page.tsx", "") || "/";

        // Clean up the content
        let cleaned = content
          .replace(/^import.*$/gm, "") // remove imports
          .replace(/ className=(\{[^}]*\}|"[^"]*"|'[^']*')/g, "") // remove className
          .replace(/^\s*[\r\n]/gm, "") // remove empty lines
          .trim();

        cleaned = toRelativeLinks(cleaned);

        const sourceId = `route:${url}`;
        documents.push({
          sourceId,
          content: `URL: ${url}\nType: Page Route\n\n${cleaned}`,
          url,
          kind: "route",
          filename: `route-${url.replace(/\//g, "-") || "home"}.txt`,
        });
      }
    }
  }

  walkDir(APP_DIR);
  return documents;
}

function collectDataFiles(): ContentDocument[] {
  const documents: ContentDocument[] = [];
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const sourceId = `data:${file}`;

    documents.push({
      sourceId,
      content: `File: ${file}\nType: Data JSON\n\n${content}`,
      url: `/${file}`,
      kind: "data",
      filename: file,
    });
  }

  return documents;
}

function collectBlogPosts(): ContentDocument[] {
  const documents: ContentDocument[] = [];

  if (!fs.existsSync(CONTENT_DIR)) {
    return documents;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  for (const file of files) {
    const fullPath = path.join(CONTENT_DIR, file);
    const rawContent = fs.readFileSync(fullPath, "utf8");
    const slug = file.replace(".mdx", "");
    const url = `/blog/${slug}`;

    // Parse frontmatter and body (full content, not just frontmatter)
    const parts = rawContent.split("---");
    if (parts.length >= 3) {
      const frontmatter = parts[1].trim();
      const body = parts.slice(2).join("---").trim();

      // Combine frontmatter metadata with full body content
      let fullContent = `URL: ${url}\nType: Blog Post\n\n`;
      fullContent += `Frontmatter:\n${frontmatter}\n\n`;
      fullContent += `Content:\n${body}`;

      // Clean up MDX-specific syntax for better embedding
      fullContent = fullContent
        .replace(/<[^>]+>/g, "") // Remove JSX/HTML tags
        .replace(/import\s+.*?from\s+['"][^'"]+['"]/g, "") // Remove imports
        .replace(/export\s+default\s+.*$/gm, "") // Remove exports
        .trim();

      fullContent = toRelativeLinks(fullContent);

      const sourceId = `blog:${slug}`;
      documents.push({
        sourceId,
        content: fullContent,
        url,
        kind: "blog",
        filename: `blog-${slug}.md`,
      });
    }
  }

  return documents;
}

function generateSummaries(): ContentDocument[] {
  const documents: ContentDocument[] = [];

  // Career summary
  try {
    const careerPath = path.join(DATA_DIR, "career.json");
    if (fs.existsSync(careerPath)) {
      const careerData = JSON.parse(fs.readFileSync(careerPath, "utf8"));
      let summary = "Vansh's Work Experience:\n\n";

      for (const job of careerData.career || []) {
        summary += `- ${job.title} at ${job.name} (${job.start} - ${job.end})\n`;
        if (job.description && Array.isArray(job.description)) {
          for (const line of job.description) {
            summary += `  - ${line}\n`;
          }
        }
      }

      documents.push({
        sourceId: "summary:career",
        content: `URL: /\nType: Career Summary\n\n${summary}`,
        url: "/",
        kind: "summary",
        filename: "career-summary.txt",
      });
    }
  } catch (e) {
    console.error("Failed to generate career summary:", e);
  }

  // Technologies summary
  try {
    const techPath = path.join(DATA_DIR, "technologies.json");
    if (fs.existsSync(techPath)) {
      const techData = JSON.parse(fs.readFileSync(techPath, "utf8"));
      let summary = "Vansh's Technologies and Skills:\n\n";

      if (techData.technologies?.primary) {
        summary +=
          "Primary Technologies: " +
          techData.technologies.primary.map((t: any) => t.name).join(", ") +
          "\n\n";
      }
      if (techData.technologies?.additional) {
        summary += "Additional Experience:\n";
        for (const group of techData.technologies.additional) {
          summary += `- ${group.label}: ${group.items.join(", ")}\n`;
        }
      }

      documents.push({
        sourceId: "summary:technologies",
        content: `URL: /\nType: Technologies Summary\n\n${summary}`,
        url: "/",
        kind: "summary",
        filename: "technologies-summary.txt",
      });
    }
  } catch (e) {
    console.error("Failed to generate technologies summary:", e);
  }

  // Site pages summary
  try {
    const sitePagesPath = path.join(DATA_DIR, "site-pages.json");
    if (fs.existsSync(sitePagesPath)) {
      const sitePagesContent = fs.readFileSync(sitePagesPath, "utf8");
      documents.push({
        sourceId: "summary:site-pages",
        content: `Type: Site Navigation\n\nAvailable pages on this portfolio:\n${sitePagesContent}`,
        url: "/",
        kind: "summary",
        filename: "site-pages-summary.txt",
      });
    }
  } catch (e) {
    console.error("Failed to generate site pages summary:", e);
  }

  return documents;
}

// ============================================================================
// OpenAI Vector Store Functions
// ============================================================================

async function fetchExistingFilesFromVectorStore(
  openai: OpenAI,
  vectorStoreId: string,
): Promise<Map<string, string>> {
  // Returns a map of filename -> fileId for files already in the vector store
  const existingFiles = new Map<string, string>();

  try {
    // List all files in the vector store
    const files = await openai.beta.vectorStores.files.list(vectorStoreId, {
      limit: 100,
    });

    for (const file of files.data) {
      try {
        // Get the file details to get the filename
        const fileDetails = await openai.files.retrieve(
          (file as any).file_id ?? file.id,
        );
        if (fileDetails.filename) {
          // Store the underlying OpenAI file id (file_...), not the vector-store-file id.
          existingFiles.set(fileDetails.filename, fileDetails.id);
        }
      } catch (e) {
        // File might not be accessible
      }
    }

    console.log(`Found ${existingFiles.size} existing files in vector store`);
  } catch (e) {
    console.log("Could not fetch existing files from vector store");
  }

  return existingFiles;
}

async function getOrCreateVectorStore(
  openai: OpenAI,
): Promise<{ id: string; isNew: boolean }> {
  // Check if we have an existing vector store ID
  const existingId = process.env.OPENAI_VECTOR_STORE_ID;

  if (existingId) {
    try {
      const store = await openai.beta.vectorStores.retrieve(existingId);
      console.log(`Using existing vector store: ${store.id}`);
      return { id: store.id, isNew: false };
    } catch (e) {
      console.log(
        `Vector store ${existingId} not found, will create a new one`,
      );
    }
  }

  // Create a new vector store
  const store = await openai.beta.vectorStores.create({
    name: VECTOR_STORE_NAME,
  });

  console.log(`Created new vector store: ${store.id}`);
  console.log(
    `\n!!! IMPORTANT: Add this to your environment variables !!!\nOPENAI_VECTOR_STORE_ID=${store.id}\n`,
  );

  return { id: store.id, isNew: true };
}

async function uploadFile(
  openai: OpenAI,
  doc: ContentDocument,
): Promise<string> {
  // Create a temporary file
  const tempDir = path.join(process.cwd(), ".temp-uploads");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, doc.filename);
  fs.writeFileSync(tempPath, doc.content);

  try {
    const file = await openai.files.create({
      file: fs.createReadStream(tempPath),
      purpose: "assistants",
    });

    return file.id;
  } finally {
    // Clean up temp file
    fs.unlinkSync(tempPath);
  }
}

async function addFileToVectorStore(
  openai: OpenAI,
  vectorStoreId: string,
  fileId: string,
): Promise<void> {
  await openai.beta.vectorStores.files.create(vectorStoreId, {
    file_id: fileId,
  });
}

async function deleteFileFromVectorStore(
  openai: OpenAI,
  vectorStoreId: string,
  fileId: string,
): Promise<void> {
  try {
    await openai.beta.vectorStores.files.del(vectorStoreId, fileId);
  } catch (e) {
    // File might already be deleted
  }

  try {
    await openai.files.del(fileId);
  } catch (e) {
    // File might already be deleted
  }
}

async function waitForVectorStoreReady(
  openai: OpenAI,
  vectorStoreId: string,
): Promise<void> {
  console.log("Waiting for vector store to process files...");

  let attempts = 0;
  const maxAttempts = 12; // ~1 minute max

  while (attempts < maxAttempts) {
    const store = await openai.beta.vectorStores.retrieve(vectorStoreId);

    if (store.status === "completed") {
      console.log("Vector store is ready!");
      return;
    }

    if (store.status === "expired") {
      throw new Error("Vector store expired");
    }

    if (store.file_counts.in_progress === 0 && store.file_counts.failed > 0) {
      console.warn(
        `Warning: ${store.file_counts.failed} files failed to process`,
      );
      return;
    }

    if (store.file_counts.in_progress === 0) {
      console.log("All files processed!");
      return;
    }

    console.log(
      `  Processing: ${store.file_counts.in_progress} in progress, ${store.file_counts.completed} completed`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Timeout waiting for vector store to process files");
}

// ============================================================================
// Main Sync Logic
// ============================================================================

async function syncVectorStore() {
  console.log("Starting vector store sync...\n");

  const openai = new OpenAI();

  // Get or create vector store
  const { id: vectorStoreId } = await getOrCreateVectorStore(openai);

  // Load existing manifest
  let manifest = loadManifest();
  let manifestWasMissing = false;

  if (!manifest || manifest.vectorStoreId !== vectorStoreId) {
    manifestWasMissing = true;
    console.log("No manifest found, fetching existing files from OpenAI...");

    // Fetch existing files from the vector store to rebuild manifest
    const existingFiles = await fetchExistingFilesFromVectorStore(
      openai,
      vectorStoreId,
    );

    manifest = {
      vectorStoreId,
      files: {},
    };

    // We'll mark existing files as "already uploaded" with a placeholder hash
    // This prevents re-uploading, but we'll update the hash after we compute it
    for (const [filename, fileId] of Array.from(existingFiles.entries())) {
      // Try to determine sourceId from filename
      let sourceId = "";
      if (filename.startsWith("route-")) {
        const urlPart = filename.replace("route-", "").replace(".txt", "");
        sourceId = `route:${urlPart === "" || urlPart === "-" ? "/" : urlPart.replace(/-/g, "/")}`;
      } else if (filename.startsWith("blog-")) {
        const slug = filename.replace("blog-", "").replace(".md", "");
        sourceId = `blog:${slug}`;
      } else if (filename.endsWith(".json")) {
        sourceId = `data:${filename}`;
      } else if (filename.includes("-summary")) {
        const type = filename.replace("-summary.txt", "");
        sourceId = `summary:${type}`;
      }

      if (sourceId) {
        manifest.files[sourceId] = {
          openaiFileId: fileId,
          sha256: "__existing__", // Placeholder - will be updated or re-uploaded
          url: "",
          kind: "data",
        };
      }
    }

    console.log(
      `Rebuilt manifest with ${Object.keys(manifest.files).length} existing files\n`,
    );
  }

  // Collect all documents
  console.log("Collecting content...");
  const allDocuments: ContentDocument[] = [
    ...collectRoutes(),
    ...collectDataFiles(),
    ...collectBlogPosts(),
    ...generateSummaries(),
  ];

  console.log(`Found ${allDocuments.length} documents to sync\n`);

  // Get git-changed files for optimization (logged but hash-based diffing is primary)
  const gitChangedFiles = getChangedFiles();
  if (gitChangedFiles) {
    console.log(`Git detected ${gitChangedFiles.size} changed files`);
  }

  const impactedSourceIds =
    getImpactedSourceIdsFromGitChangedFiles(gitChangedFiles);

  // Determine what needs to be uploaded/deleted
  const currentSourceIds = new Set(allDocuments.map((d) => d.sourceId));
  const existingSourceIds = Object.keys(manifest.files);

  // Files to delete (exist in manifest but not in current docs)
  const toDelete: string[] = [];
  for (const sourceId of existingSourceIds) {
    if (!currentSourceIds.has(sourceId)) {
      toDelete.push(sourceId);
    }
  }

  // Files to upload (new or changed)
  const toUpload: ContentDocument[] = [];
  for (const doc of allDocuments) {
    const hash = sha256(doc.content);
    const existing = manifest.files[doc.sourceId];

    if (!existing) {
      // New file
      toUpload.push(doc);
    } else if (existing.sha256 === "__existing__") {
      // File exists in OpenAI but we don't know if content changed.
      // If git says the underlying source changed, treat it as changed.
      if (impactedSourceIds?.has(doc.sourceId)) {
        toUpload.push(doc);
        toDelete.push(doc.sourceId);
      } else {
        // Otherwise, trust that the existing upload is still valid.
        manifest.files[doc.sourceId].sha256 = hash;
        manifest.files[doc.sourceId].url = doc.url;
        manifest.files[doc.sourceId].kind = doc.kind;
      }
    } else if (existing.sha256 !== hash) {
      // Content changed
      toUpload.push(doc);
      toDelete.push(doc.sourceId); // Delete old version first
    }
    // else: unchanged, skip
  }

  console.log(`Changes detected:`);
  console.log(`  - ${toDelete.length} files to delete`);
  console.log(`  - ${toUpload.length} files to upload`);
  console.log();

  if (toDelete.length === 0 && toUpload.length === 0) {
    console.log("No changes detected. Vector store is up to date!");
    // Save manifest if it was rebuilt from OpenAI
    if (manifestWasMissing) {
      saveManifest(manifest);
      console.log("Manifest saved for future builds.");
    }
    return;
  }

  // Delete old files
  for (const sourceId of toDelete) {
    const entry = manifest.files[sourceId];
    if (entry) {
      console.log(`Deleting: ${sourceId}`);
      await deleteFileFromVectorStore(
        openai,
        vectorStoreId,
        entry.openaiFileId,
      );
      delete manifest.files[sourceId];
    }
  }

  // Upload new/changed files
  for (const doc of toUpload) {
    console.log(`Uploading: ${doc.sourceId} (${doc.filename})`);

    try {
      const fileId = await uploadFile(openai, doc);
      await addFileToVectorStore(openai, vectorStoreId, fileId);

      manifest.files[doc.sourceId] = {
        openaiFileId: fileId,
        sha256: sha256(doc.content),
        url: doc.url,
        kind: doc.kind,
      };
    } catch (e) {
      console.error(`Failed to upload ${doc.sourceId}:`, e);
    }
  }

  // Save manifest BEFORE waiting so a slow index build doesn't cause
  // the next deployment to re-upload everything again.
  saveManifest(manifest);

  // Wait for processing (best-effort). Indexing can sometimes take longer than
  // a Vercel build allows.
  if (toUpload.length > 0) {
    try {
      await waitForVectorStoreReady(openai, vectorStoreId);
    } catch (error: any) {
      console.warn(
        "Vector store is still processing; continuing build without waiting:",
        error?.message ?? error,
      );
    }
  }

  console.log("\nSync complete!");
  console.log(`Vector store ID: ${vectorStoreId}`);
  console.log(`Total files in store: ${Object.keys(manifest.files).length}`);

  // Clean up temp directory
  const tempDir = path.join(process.cwd(), ".temp-uploads");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
}

// ============================================================================
// Entry Point
// ============================================================================

syncVectorStore().catch((error) => {
  console.error("Vector store sync failed:", error.message);

  // Don't fail the build, just warn
  if (process.env.VECTOR_SYNC_REQUIRED === "true") {
    process.exit(1);
  } else {
    console.log("\nBuild will continue without vector store updates.");
    console.log("Set VECTOR_SYNC_REQUIRED=true to fail builds on sync errors.");
    process.exit(0);
  }
});
