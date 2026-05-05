import fs from "fs/promises";

import { readArticles, writeArticles } from "../lib/articles-store.js";

await loadEnvFile(".env.local");

const slugs = new Set(process.argv.slice(2));
if (!slugs.size) {
  throw new Error("Usage: node scripts/remove-articles.mjs <slug> [slug...]");
}

const articles = await readArticles();
const next = articles.filter((article) => !slugs.has(article.slug));
await writeArticles(next);

console.log(
  JSON.stringify(
    {
      before: articles.length,
      after: next.length,
      removed: articles.filter((article) => slugs.has(article.slug)).map((article) => article.slug),
    },
    null,
    2,
  ),
);

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
