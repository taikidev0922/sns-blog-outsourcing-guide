import { labels } from "./article-generator.js";
import { nicheConfig } from "./niche-config.js";
import crypto from "crypto";

const API_BASE = nicheConfig.officialSources.apiBase;
const CACHE_PREFIX = nicheConfig.officialSources.cachePrefix;
const DEFAULT_CACHE_HOURS = 24;

export async function fetchOfficialProductContext(keywordCandidate) {
  if (!nicheConfig.officialSources.enabled) {
    return {
      sourceSite: null,
      fetchedAt: new Date().toISOString(),
      keyword: keywordCandidate.keyword,
      product: keywordCandidate.product,
      queries: [],
      sources: [],
      summary: "公式情報取得はこのテンプレート設定では無効です。",
      cache: "disabled",
    };
  }

  const cacheKey = buildCacheKey(keywordCandidate);
  const cached = await readCachedContext(cacheKey);
  if (cached) return { ...cached, cache: "hit" };

  const queries = buildSearchQueries(keywordCandidate);
  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    const posts = await searchOfficialPosts(query);

    for (const post of posts) {
      if (seen.has(post.link)) continue;
      seen.add(post.link);
      const source = normalizePost(post);
      const relevanceScore = scoreSourceRelevance(source, keywordCandidate);
      if (relevanceScore > 0) {
        candidates.push({ ...source, relevanceScore });
      }
    }
  }

  const sources = candidates
    .sort((a, b) => b.relevanceScore - a.relevanceScore || new Date(b.modifiedAt) - new Date(a.modifiedAt))
    .slice(0, 4);

  const context = {
    sourceSite: nicheConfig.officialSources.sourceSite,
    fetchedAt: new Date().toISOString(),
    keyword: keywordCandidate.keyword,
    product: keywordCandidate.product,
    queries,
    sources,
    summary: buildSourceSummary(sources),
  };

  await writeCachedContext(cacheKey, context);
  return { ...context, cache: "miss" };
}

function buildSearchQueries(keywordCandidate) {
  const productLabel = labels.product[keywordCandidate.product] || "";
  const productTerms = getProductTerms(keywordCandidate.product, String(keywordCandidate.keyword || "").toLowerCase());
  return [
    keywordCandidate.keyword,
    ...productTerms.slice(0, 3).map((term) => `${nicheConfig.brandName} ${term}`),
    productLabel ? `${nicheConfig.brandName} ${productLabel}` : "",
    keywordCandidate.intent ? `${nicheConfig.brandName} ${keywordCandidate.intent}` : "",
  ].filter(Boolean);
}

async function searchOfficialPosts(query) {
  const url = new URL(API_BASE);
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", "6");
  url.searchParams.set("_fields", "id,date,modified,link,title,excerpt,content");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": nicheConfig.officialSources.userAgent,
    },
    cache: "no-store",
  });

  if (!response.ok) return [];
  const payload = await response.json().catch(() => []);
  return Array.isArray(payload) ? payload : [];
}

function scoreSourceRelevance(source, keywordCandidate) {
  const text = `${source.title} ${source.excerpt} ${source.facts.join(" ")}`.toLowerCase();
  const primaryText = `${source.title} ${source.excerpt}`.toLowerCase();
  const keyword = String(keywordCandidate.keyword || "").toLowerCase();
  const productTerms = getProductTerms(keywordCandidate.product, keyword);
  let score = 0;
  let productHits = 0;
  let primaryProductHits = 0;

  for (const term of productTerms) {
    if (term && text.includes(term.toLowerCase())) {
      productHits += 1;
      score += 4;
    }
    if (term && primaryText.includes(term.toLowerCase())) {
      primaryProductHits += 1;
      score += 6;
    }
  }

  if (productTerms.length && productHits === 0) return 0;
  if (productTerms.length && primaryProductHits === 0) return 0;

  for (const token of keyword.split(/\s+/).filter((item) => item && item.toLowerCase() !== nicheConfig.id)) {
    if (["レビュー", "口コミ", "おすすめ", "使い方", "設定", "比較"].includes(token)) continue;
    if (text.includes(token)) score += 2;
  }

  if (keywordCandidate.intent && text.includes(String(keywordCandidate.intent).toLowerCase())) score += 1;
  if (source.title.includes(nicheConfig.brandName)) score += 1;
  return score;
}

function getProductTerms(product, keyword) {
  const terms = {
    hub: ["ハブ2", "ハブ２", "ハブミニ", "ハブ", "Hub 2", "Hub Mini"],
    lock: ["スマートロック", "ロック", "指紋認証パッド"],
    curtain: ["カーテン", "スマートカーテン"],
    sensor: ["温湿度計", "温湿度センサー", "センサー"],
    camera: ["見守りカメラ", "屋外カメラ", "カメラ"],
    plug: ["プラグミニ", "スマートプラグ", "プラグ"],
  };

  const productTerms = terms[product] || [];
  const keywordTerms = ["ハブ2", "ハブ２", "ハブミニ", "スマートロック", "カーテン", "温湿度計", "カメラ", "プラグ"]
    .filter((term) => keyword.includes(term.toLowerCase()));
  return [...new Set([...keywordTerms, ...productTerms])];
}

function normalizePost(post) {
  const title = stripHtml(post.title?.rendered || "");
  const excerpt = stripHtml(post.excerpt?.rendered || "");
  const content = stripHtml(post.content?.rendered || "");

  return {
    title,
    url: post.link,
    publishedAt: post.date,
    modifiedAt: post.modified,
    excerpt: excerpt.slice(0, 320),
    facts: extractFactSentences(`${excerpt} ${content}`).slice(0, 6),
  };
}

function extractFactSentences(text) {
  return stripHtml(text)
    .replace(/\s+/g, " ")
    .split(/[。！？]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .filter((sentence) => !sentence.includes("目次"))
    .slice(0, 12)
    .map((sentence) => `${sentence}。`);
}

function buildSourceSummary(sources) {
  if (!sources.length) {
    return `${nicheConfig.generation.sourceName}から該当製品の情報を取得できませんでした。断定的な製品仕様は書かず、一般的な購入判断と確認手順に限定してください。`;
  }

  return sources
    .map((source, index) => {
      const facts = source.facts.slice(0, 3).join(" ");
      return `${index + 1}. ${source.title} (${source.url}) ${facts}`;
    })
    .join("\n");
}

function stripHtml(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8220;|&#8221;/g, "\"")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function readCachedContext(cacheKey) {
  if (!hasBlobToken()) return null;

  try {
    const { list } = await import("@vercel/blob");
    const pathname = `${CACHE_PREFIX}/${cacheKey}.json`;
    const result = await list({ prefix: pathname, limit: 1 });
    const blob = result.blobs.find((entry) => entry.pathname === pathname);
    if (!blob) return null;

    const response = await fetch(`${blob.url}?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const context = await response.json();
    const cacheHours = Number(process.env[nicheConfig.officialSources.cacheHoursEnv] || DEFAULT_CACHE_HOURS);
    const ageMs = Date.now() - new Date(context.fetchedAt).getTime();
    if (ageMs > cacheHours * 60 * 60 * 1000) return null;
    return context;
  } catch {
    return null;
  }
}

async function writeCachedContext(cacheKey, context) {
  if (!hasBlobToken()) return;

  try {
    const { put } = await import("@vercel/blob");
    await put(`${CACHE_PREFIX}/${cacheKey}.json`, JSON.stringify(context, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
    });
  } catch {
    // Source caching is helpful but should not block article publishing.
  }
}

function buildCacheKey(keywordCandidate) {
  const raw = `${keywordCandidate.product || "unknown"}-${keywordCandidate.intent || "general"}-${keywordCandidate.keyword || ""}`;
  const readable = `${keywordCandidate.product || "unknown"}-${keywordCandidate.intent || "general"}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return `${readable}-${hash}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
