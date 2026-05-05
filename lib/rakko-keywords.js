import { nicheConfig } from "./niche-config.js";

const RAKKO_API_BASE_URL = "https://api.rakkokeyword.com";
const seedKeywords = nicheConfig.rakkoSeedKeywords;
const keywordProfiles = [
  {
    id: "head",
    endpoint: "/v1/suggest-keywords",
    sortBy: "searchVolume",
    orderBy: "desc",
    filter: {
      searchVolume: { min: 300 },
    },
  },
  {
    id: "middle",
    endpoint: "/v1/related-keywords",
    matchType: "partialMatch",
    sortBy: "searchVolume",
    orderBy: "desc",
    filter: {
      searchVolume: { min: 50, max: 500 },
      seoDifficulty: { min: 1, max: 66 },
    },
  },
  {
    id: "long-tail-low-competition",
    endpoint: "/v1/related-keywords",
    matchType: "partialMatch",
    sortBy: "seoDifficulty",
    orderBy: "asc",
    filter: {
      searchVolume: { min: 10, max: 120 },
      seoDifficulty: { min: 1, max: 35 },
    },
  },
  {
    id: "emerging",
    endpoint: "/v1/suggest-keywords",
    sortBy: "firstSeenRange",
    orderBy: "asc",
    filter: {
      searchVolume: { min: 10, max: 300 },
      firstSeenRange: { include: "last_90_days" },
    },
  },
];

export async function fetchRakkoKeywordCandidates(existingArticles, options = {}) {
  if (process.env.RAKKO_KEYWORD_LIVE !== "true") {
    return { source: "rakko-disabled", candidates: [], consumedCredit: 0 };
  }

  const apiKey = process.env.RAKKO_KEYWORD_API_KEY;
  if (!apiKey) {
    return { source: "rakko-missing-key", candidates: [], consumedCredit: 0 };
  }

  const seed = options.seedKeyword || seedKeywords[existingArticles.length % seedKeywords.length];
  const profileIds = parseProfileIds(options.profileIds || process.env.RAKKO_KEYWORD_PROFILE_IDS);
  const profiles = profileIds.length
    ? keywordProfiles.filter((profile) => profileIds.includes(profile.id))
    : keywordProfiles;
  const limitPerProfile = Number(process.env.RAKKO_KEYWORD_FETCH_LIMIT || 12);
  const results = [];
  let consumedCredit = 0;
  let firstError = null;

  for (const profile of profiles) {
    const result = await fetchRakkoProfile({ seed, profile, limit: limitPerProfile, apiKey });
    consumedCredit += result.consumedCredit || 0;
    if (result.error && !firstError) firstError = result.error;
    results.push(...result.candidates);
  }

  const candidates = dedupeCandidates(results).filter(isRelevantKeyword);

  return {
    source: candidates.length ? "rakko" : firstError ? "rakko-error" : "rakko-empty",
    seedKeyword: seed,
    consumedCredit,
    candidates,
    error: candidates.length ? null : firstError,
  };
}

async function fetchRakkoProfile({ seed, profile, limit, apiKey }) {
  const response = await fetch(`${RAKKO_API_BASE_URL}${profile.endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(compactObject({
      keyword: seed,
      modes: profile.endpoint === "/v1/suggest-keywords" ? ["google"] : undefined,
      increaseKeyword: profile.endpoint === "/v1/suggest-keywords" ? false : undefined,
      matchType: profile.matchType,
      filter: profile.filter,
      sortBy: profile.sortBy,
      orderBy: profile.orderBy,
      limit,
    })),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.result) {
    return {
      profileId: profile.id,
      candidates: [],
      consumedCredit: payload?.meta?.consumedCredit || 0,
      error: payload?.errors?.join(", ") || `Rakko API failed with status ${response.status}`,
    };
  }

  const items = Array.isArray(payload.data?.items) ? payload.data.items : [];

  return {
    profileId: profile.id,
    consumedCredit: payload.meta?.consumedCredit || 0,
    candidates: items
      .filter((item) => item?.keyword)
      .map((item) => ({
        keyword: item.keyword,
        source: "rakko",
        metrics: {
          ...(item.metrics || {}),
          keywordTier: profile.id,
          rakkoEndpoint: profile.endpoint,
          rakkoSortBy: profile.sortBy,
          rakkoOrderBy: profile.orderBy,
          suggestClass: item.suggestClass || null,
          suggestEngines: item.suggestEngines || null,
        },
      })),
  };
}

function parseProfileIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const deduped = [];

  for (const candidate of candidates) {
    const key = normalizeKeyword(candidate.keyword);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function isRelevantKeyword(candidate) {
  const keyword = normalizeKeyword(candidate.keyword);
  if (!keyword) return false;
  if (keyword.length < 3 || keyword.length > 80) return false;
  if (hasAny(keyword, ["ログイン", "退会", "電話占い", "占い", "求人", "採用", "株価", "決算"])) return false;
  return hasAny(keyword, [
    "ココナラ",
    "依頼",
    "外注",
    "相場",
    "料金",
    "費用",
    "選び方",
    "比較",
    "失敗",
    "後悔",
    "自作",
    "作り方",
    "ロゴ",
    "アイコン",
    "サムネ",
    "YouTube",
    "Kindle",
    "表紙",
    "プロフィール",
    "自己紹介",
    "記事",
    "リライト",
    "添削",
    "Canva",
    "バナー",
    "アイキャッチ",
  ]);
}

function normalizeKeyword(keyword) {
  return String(keyword || "").replace(/\s+/g, " ").trim();
}

function hasAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
