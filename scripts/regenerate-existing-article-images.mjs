import fs from "fs/promises";
import { readArticles, writeArticles } from "../lib/articles-store.js";
import { generateImageWithOpenAI } from "../lib/openai-images.js";

await loadEnvFile(".env.local");
await loadEnvFile(".env.vercel.local");
await loadEnvFile(".env.production.local");

process.env.ARTICLE_PIPELINE_MODE = "production";
process.env.OPENAI_IMAGE_LIVE = "true";

const limitArg = Number(process.argv[2] || 0);
const articles = await readArticles();
const targets = limitArg > 0 ? articles.slice(0, limitArg) : articles;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required.");
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is required to update production article images.");
}

const updatedBySlug = new Map();
const results = [];

for (const article of targets) {
  const generatedImage = await generateImageWithOpenAI(article);
  if (!generatedImage?.imageUrl) {
    results.push({
      slug: article.slug,
      ok: false,
      error: generatedImage?.error || "Image generation returned no image URL.",
    });
    continue;
  }

  updatedBySlug.set(article.slug, {
    ...article,
    imageUrl: generatedImage.imageUrl,
    imageSource: generatedImage.source,
    imageModel: generatedImage.model,
    imageRegeneratedAt: new Date().toISOString(),
  });

  results.push({
    slug: article.slug,
    ok: true,
    imageUrl: generatedImage.imageUrl,
    imageModel: generatedImage.model,
  });
}

const nextArticles = articles.map((article) => updatedBySlug.get(article.slug) || article);
await writeArticles(nextArticles);

console.log(JSON.stringify({
  ok: results.every((result) => result.ok),
  totalArticles: articles.length,
  targetCount: targets.length,
  updatedCount: updatedBySlug.size,
  results,
}, null, 2));

async function loadEnvFile(path) {
  const raw = await fs.readFile(path, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
