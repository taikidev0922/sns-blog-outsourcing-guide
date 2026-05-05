import fs from "fs/promises";
import { generateArticleWithClaude } from "../lib/claude-articles.js";

await loadEnvFile(".env.local");

process.env.ARTICLE_PIPELINE_MODE = "test";
process.env.TEST_CLAUDE_ARTICLE_LIVE = "true";
process.env.TEST_CLAUDE_MAX_TOKENS = process.env.TEST_CLAUDE_MAX_TOKENS || "1600";

const result = await generateArticleWithClaude(
  {
    keyword: "SNS アイコン 依頼",
    category: "request",
    product: "sns-icon",
    intent: "brief",
    offerId: "sns-icon",
  },
  [],
);

console.log(JSON.stringify({
  source: result?.source,
  title: result?.title,
  error: result?.error || null,
  blocks: result?.blocks?.length || 0,
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
