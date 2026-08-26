import fs from "node:fs";
import path from "node:path";

const inputPath = path.join(process.cwd(), "src/data/linkedin-profile.json");
const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const pending = data.drift.filter((item) => item.status !== "done");

console.log(`LinkedIn snapshot: ${data.observed.capturedAt}`);
console.log(`Desired profile version: ${data.schemaVersion}`);
console.log(`Pending actions: ${pending.length}`);

for (const item of pending) {
  console.log(`- [${item.priority}] ${item.section}: ${item.action}`);
}

if (pending.length > 0) process.exitCode = 1;
