import fs from "fs/promises";
import { readArticles, writeArticles } from "../lib/articles-store.js";

await loadEnvFile(".env.local");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is required.");
}

const localArticles = JSON.parse(await fs.readFile("data/articles.json", "utf8").catch(() => "[]"));
await writeArticles(localArticles);
const remoteArticles = await readArticles();

console.log(JSON.stringify({
  uploaded: localArticles.length,
  readBack: remoteArticles.length,
  firstSlug: remoteArticles[0]?.slug || null,
}, null, 2));

async function loadEnvFile(path) {
  const raw = await fs.readFile(path, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
