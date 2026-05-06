import fs from "fs/promises";
import { readArticles, writeArticles } from "../lib/articles-store.js";
import { nicheConfig } from "../lib/niche-config.js";

await loadEnvFile(".env.production.local");
await loadEnvFile(".env.local");

const sourceUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || nicheConfig.siteUrl;
const response = await fetch(`${sourceUrl}/api/articles`, { cache: "no-store" });
if (!response.ok) throw new Error(`Failed to fetch production articles: ${response.status}`);

const payload = await response.json();
const articles = Array.isArray(payload) ? payload : payload.articles || [];

await writeArticles(articles);
const readBack = await readArticles();

console.log(JSON.stringify({
  sourceUrl,
  articleStoreId: process.env.ARTICLE_STORE_ID || nicheConfig.id,
  migrated: articles.length,
  readBack: readBack.length,
  latest: readBack.slice(0, 3).map((article) => ({
    slug: article.slug,
    title: article.title,
    keyword: article.keyword,
  })),
}, null, 2));

async function loadEnvFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
