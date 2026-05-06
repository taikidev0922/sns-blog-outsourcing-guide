import fs from "fs/promises";
import path from "path";
import { nicheConfig } from "./niche-config.js";

const ARTICLE_STORE_ID = process.env.ARTICLE_STORE_ID || nicheConfig.id;
const LOCAL_DATA_PATH = path.join(process.cwd(), "data", `${ARTICLE_STORE_ID}-articles.json`);
const BLOB_PATH = `cms/${ARTICLE_STORE_ID}/articles.json`;

export async function readArticles() {
  if (hasBlobToken()) return readFromBlob();
  return readFromLocalFile();
}

export async function writeArticles(articles) {
  const normalized = normalizeArticles(articles);
  if (hasBlobToken()) return writeToBlob(normalized);

  if (process.env.VERCEL) {
    const error = new Error("Persistent storage is not configured. Set BLOB_READ_WRITE_TOKEN or connect Vercel Blob.");
    error.code = "STORAGE_NOT_CONFIGURED";
    throw error;
  }

  await fs.writeFile(LOCAL_DATA_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export async function appendArticle(article) {
  const articles = await readArticles();
  if (articles.some((entry) => entry.slug === article.slug)) return { article, articles };

  const nextArticles = [article, ...articles];
  await writeArticles(nextArticles);
  return { article, articles: nextArticles };
}

async function readFromLocalFile() {
  try {
    const raw = await fs.readFile(LOCAL_DATA_PATH, "utf8");
    return normalizeArticles(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function readFromBlob() {
  const { list } = await import("@vercel/blob");
  const result = await list({ prefix: BLOB_PATH, limit: 1 });
  const blob = result.blobs.find((entry) => entry.pathname === BLOB_PATH);
  if (!blob) return [];

  const response = await fetch(`${blob.url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) return [];
  return normalizeArticles(await response.json());
}

async function writeToBlob(articles) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, JSON.stringify(articles, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  });
  return articles;
}

function normalizeArticles(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && entry.slug && entry.title)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
