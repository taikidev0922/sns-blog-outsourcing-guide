import fs from "fs/promises";

await loadEnvFile(".env.local");

const apiKey = process.env.RAKKO_KEYWORD_API_KEY;
if (!apiKey) {
  throw new Error("RAKKO_KEYWORD_API_KEY is required to research trouble keywords with search volume.");
}

const seeds = [
  { intent: "brief", seed: "依頼文 書き方", labelHint: "依頼文の書き方" },
  { intent: "brief", seed: "ココナラ 依頼文", labelHint: "依頼文テンプレ" },
  { intent: "brief", seed: "ココナラ 見積り相談 書き方", labelHint: "見積り相談の書き方" },
  { intent: "budget", seed: "外注 相場", labelHint: "外注相場" },
  { intent: "budget", seed: "ココナラ 相場", labelHint: "ココナラ相場" },
  { intent: "budget", seed: "ロゴ 依頼 相場", labelHint: "ロゴ依頼相場" },
  { intent: "budget", seed: "サムネイル 外注 相場", labelHint: "サムネイル外注相場" },
  { intent: "budget", seed: "イラスト 依頼 相場", labelHint: "イラスト依頼相場" },
  { intent: "selfmade-limit", seed: "自作 外注 どっち", labelHint: "自作か外注か" },
  { intent: "selfmade-limit", seed: "デザイン 自作 限界", labelHint: "自作の限界" },
  { intent: "selfmade-limit", seed: "ロゴ 自作", labelHint: "ロゴ自作" },
  { intent: "selfmade-limit", seed: "サムネイル 自作", labelHint: "サムネイル自作" },
  { intent: "creator-selection", seed: "ココナラ 選び方", labelHint: "出品者の選び方" },
  { intent: "creator-selection", seed: "ココナラ 失敗", labelHint: "失敗回避" },
  { intent: "creator-selection", seed: "ココナラ 出品者 選び方", labelHint: "出品者の選び方" },
];

const allItems = [];
for (const seed of seeds) {
  const result = await fetchRakko(seed.seed);
  for (const item of result.items) {
    allItems.push({
      ...seed,
      keyword: item.keyword,
      metrics: item.metrics || {},
      searchVolume: Number(item.metrics?.searchVolume || item.searchVolume || 0),
    });
  }
}

const ranked = allItems
  .filter((item) => item.keyword)
  .filter(isRelevantTroubleKeyword)
  .sort((a, b) => b.searchVolume - a.searchVolume || a.keyword.length - b.keyword.length);

const selected = selectOnePerIntent(ranked);
const output = {
  generatedAt: new Date().toISOString(),
  selected,
  ranked: ranked.slice(0, 80),
};

await fs.mkdir("data", { recursive: true });
await fs.writeFile("data/rakko-trouble-keywords.json", `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  selected,
  savedTo: "data/rakko-trouble-keywords.json",
}, null, 2));

async function fetchRakko(keyword) {
  const response = await fetch("https://api.rakkokeyword.com/v1/suggest-keywords", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      keyword,
      modes: ["google"],
      increaseKeyword: false,
      sortBy: "searchVolume",
      orderBy: "desc",
      limit: Number(process.env.RAKKO_TROUBLE_FETCH_LIMIT || 20),
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.result) {
    throw new Error(payload?.errors?.join(", ") || `Rakko API failed for "${keyword}" with status ${response.status}`);
  }

  return {
    consumedCredit: payload.meta?.consumedCredit || 0,
    items: Array.isArray(payload.data?.items) ? payload.data.items : [],
  };
}

function selectOnePerIntent(items) {
  const picked = [];
  const usedIntents = new Set();

  for (const item of items) {
    if (usedIntents.has(item.intent)) continue;
    picked.push({
      label: buildLabel(item),
      keyword: item.keyword,
      intent: item.intent,
      href: `/?intent=${item.intent}#articles`,
      searchVolume: item.searchVolume,
      metrics: item.metrics,
    });
    usedIntents.add(item.intent);
  }

  return picked;
}

function buildLabel(item) {
  if (item.intent === "brief") return "依頼文の書き方を知りたい";
  if (item.intent === "budget") return "制作外注の相場を知りたい";
  if (item.intent === "selfmade-limit") return "自作か外注か迷っている";
  if (item.intent === "creator-selection") return "ココナラ依頼で失敗したくない";
  return item.labelHint || item.keyword;
}

function isRelevantTroubleKeyword(item) {
  const keyword = item.keyword.replace(/\s+/g, " ");
  if (item.searchVolume <= 0) return false;
  if (hasAny(keyword, ["決済", "ログイン", "退会", "電話", "占い", "給与", "結婚式", "ムービー", "おひねり"])) return false;

  if (item.intent === "brief") {
    return hasAny(keyword, ["依頼文", "見積", "相談", "書き方"]);
  }

  if (item.intent === "budget") {
    return hasAny(keyword, ["相場", "料金", "費用"]) &&
      hasAny(keyword, ["外注", "依頼", "ココナラ", "ロゴ", "サムネイル", "イラスト", "記事", "デザイン"]);
  }

  if (item.intent === "selfmade-limit") {
    return hasAny(keyword, ["自作", "作り方", "外注", "どっち", "Canva"]) &&
      hasAny(keyword, ["ロゴ", "サムネイル", "アイコン", "デザイン", "表紙", "記事", "外注"]);
  }

  if (item.intent === "creator-selection") {
    return hasAny(keyword, ["ココナラ", "出品者", "依頼"]) &&
      hasAny(keyword, ["失敗", "選び方", "トラブル", "注意", "評判"]);
  }

  return true;
}

function hasAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

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
