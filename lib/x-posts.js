import crypto from "crypto";
import { nicheConfig } from "./niche-config.js";

const SEARCH_ENDPOINT = "https://api.x.com/2/tweets/search/recent";
const OEMBED_ENDPOINT = "https://publish.x.com/oembed";
const CACHE_PREFIX = "cms/x-posts";
const DEFAULT_CACHE_DAYS = 7;

export async function fetchRelatedXPosts(keywordCandidate, pipeline) {
  if (!pipeline.xPostSearchLive) {
    return { status: `skipped-${pipeline.mode}-mode`, posts: [], consumedReads: 0 };
  }

  const bearerToken = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return { status: "skipped-missing-token", posts: [], consumedReads: 0 };
  }

  const cacheKey = buildCacheKey(keywordCandidate);
  const cached = await readCachedPosts(cacheKey);
  if (cached) return { ...cached, cache: "hit" };

  const requestedReads = clamp(Number(pipeline.xMaxPostReadsPerArticle || 10), 10, 100);
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("query", buildSearchQuery(keywordCandidate));
  url.searchParams.set("max_results", String(requestedReads));
  url.searchParams.set("tweet.fields", "author_id,created_at,lang,public_metrics,possibly_sensitive");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      status: "x-search-error",
      posts: [],
      consumedReads: 0,
      error: payload?.detail || payload?.title || `X API failed with status ${response.status}`,
    };
  }

  const posts = normalizePosts(payload?.data || [], pipeline.xMaxEmbedsPerArticle, payload?.includes?.users || []);
  const result = {
    status: "x-search",
    fetchedAt: new Date().toISOString(),
    query: url.searchParams.get("query"),
    posts,
    consumedReads: Number(payload?.meta?.result_count || posts.length || 0),
  };

  await writeCachedPosts(cacheKey, result);
  return { ...result, cache: "miss" };
}

export async function fetchXPostEmbeds(posts = []) {
  const embeds = [];

  for (const post of posts.slice(0, 3)) {
    const url = new URL(OEMBED_ENDPOINT);
    url.searchParams.set("url", buildEmbeddablePostUrl(post));
    url.searchParams.set("omit_script", "true");
    url.searchParams.set("dnt", "true");
    url.searchParams.set("theme", "light");

    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      embeds.push({ ...post, html: null });
      continue;
    }

    const payload = await response.json().catch(() => null);
    embeds.push({ ...post, html: payload?.html || null });
  }

  return embeds;
}

function buildSearchQuery(keywordCandidate) {
  const productTerms = getProductTerms(keywordCandidate);
  const quotedTerms = [keywordCandidate.keyword, ...productTerms]
    .filter(Boolean)
    .slice(0, 4)
    .map((term) => `"${String(term).replaceAll('"', "")}"`);

  return [`(${quotedTerms.join(" OR ")})`, "lang:ja", "-is:retweet", "-is:reply"].join(" ");
}

function getProductTerms(keywordCandidate) {
  const product = keywordCandidate.product;
  const terms = {
    "sns-icon": ["SNSアイコン", "アイコン依頼", "イラスト依頼"],
    "blog-logo": ["ブログロゴ", "ロゴ依頼", "ロゴデザイン"],
    "youtube-thumbnail": ["YouTubeサムネイル", "サムネイル依頼", "サムネ制作"],
    "kindle-cover": ["Kindle表紙", "表紙デザイン", "電子書籍表紙"],
    "note-header": ["noteヘッダー", "ヘッダー画像", "アイキャッチ"],
    "profile-copy": ["プロフィール文", "自己紹介文", "文章添削"],
    "article-edit": ["記事リライト", "記事添削", "ブログ記事外注"],
    "blog-parts": ["ブログ素材", "バナー制作", "アイキャッチ"],
    "canva-support": ["Canva", "バナー制作", "デザイン外注"],
  };
  return terms[product] || [];
}

function normalizePosts(posts, maxEmbeds, users = []) {
  const userById = new Map(users.map((user) => [user.id, user]));

  return posts
    .filter((post) => post?.id && post?.text)
    .filter((post) => post.lang === "ja")
    .filter((post) => !post.possibly_sensitive)
    .filter((post) => !looksLikeSpam(post.text))
    .sort((a, b) => scorePost(b) - scorePost(a))
    .slice(0, clamp(Number(maxEmbeds || 3), 1, 5))
    .map((post) => {
      const user = userById.get(post.author_id);
      const authorUsername = user?.username || null;

      return {
        id: post.id,
        url: authorUsername ? `https://x.com/${authorUsername}/status/${post.id}` : `https://x.com/i/web/status/${post.id}`,
        authorId: post.author_id || null,
        authorUsername,
        authorName: user?.name || null,
        text: post.text.slice(0, 280),
        createdAt: post.created_at,
        publicMetrics: post.public_metrics || {},
      };
    });
}

function buildEmbeddablePostUrl(post) {
  if (post?.authorUsername && post?.id) {
    return `https://x.com/${post.authorUsername}/status/${post.id}`;
  }
  return post.url;
}

function scorePost(post) {
  const metrics = post.public_metrics || {};
  return Number(metrics.like_count || 0) + Number(metrics.retweet_count || 0) * 2 + Number(metrics.reply_count || 0);
}

function looksLikeSpam(text) {
  const value = String(text);
  return [
    "プレゼント",
    "抽選",
    "無料配布",
    "副業",
    "稼げ",
    "招待コード",
    "http://",
  ].some((word) => value.includes(word));
}

async function readCachedPosts(cacheKey) {
  if (!hasBlobToken()) return null;

  try {
    const { list } = await import("@vercel/blob");
    const pathname = `${CACHE_PREFIX}/${cacheKey}.json`;
    const result = await list({ prefix: pathname, limit: 1 });
    const blob = result.blobs.find((entry) => entry.pathname === pathname);
    if (!blob) return null;

    const response = await fetch(`${blob.url}?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    const cacheDays = Number(process.env.X_POST_CACHE_DAYS || DEFAULT_CACHE_DAYS);
    const ageMs = Date.now() - new Date(data.fetchedAt).getTime();
    if (ageMs > cacheDays * 24 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeCachedPosts(cacheKey, data) {
  if (!hasBlobToken()) return;

  try {
    const { put } = await import("@vercel/blob");
    await put(`${CACHE_PREFIX}/${cacheKey}.json`, JSON.stringify(data, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
    });
  } catch {
    // X cache misses should not block article publishing.
  }
}

function buildCacheKey(keywordCandidate) {
  const raw = `${keywordCandidate.product || "unknown"}-${keywordCandidate.intent || "general"}-${keywordCandidate.keyword || ""}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return `${keywordCandidate.product || "unknown"}-${keywordCandidate.intent || "general"}-${hash}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
