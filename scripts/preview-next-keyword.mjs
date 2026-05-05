import fs from "fs/promises";
import { readArticles } from "../lib/articles-store.js";
import { selectKeywordForArticle } from "../lib/keyword-store.js";

await loadEnvFile(".env.local");
await loadEnvFile(".env.production.local");

process.env.RAKKO_KEYWORD_LIVE = "false";

const articles = await readArticles();
const keyword = await selectKeywordForArticle(articles);

console.log(JSON.stringify({
  articleCount: articles.length,
  recentProducts: articles.slice(0, 5).map((article) => article.product),
  next: keyword,
}, null, 2));

async function loadEnvFile(path) {
  const raw = await fs.readFile(path, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}
