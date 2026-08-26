import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import { createDefaultState } from "../src/lib/resume-builder/defaults";

async function main() {
  process.env.RESUME_FONT_BASE = path.join(process.cwd(), "public");

  const { default: ResumePdfDocument } = await import(
    "../src/components/resume-builder/ResumePdfDocument"
  );

  const outputPath = path.join(process.cwd(), "public", "VanshRaja_Resume.pdf");
  const state = createDefaultState();

  // A public resume should foreground the degree, current work, and strongest
  // recent projects. Older school entries remain available in the builder.
  state.education = state.education.map((entry, index) => ({
    ...entry,
    enabled: index === 0,
  }));
  const publicProjectIndexes = new Set([0, 1, 2, 5]);
  state.projects = state.projects.map((entry, index) => ({
    ...entry,
    enabled: publicProjectIndexes.has(index),
  }));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await renderToFile(<ResumePdfDocument state={state} />, outputPath);
  console.log(`Generated ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
