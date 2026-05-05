import fs from "node:fs";

const raw = fs.readFileSync(".vercel/.env.production.local", "utf8");
const env = {};

for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const index = line.indexOf("=");
  if (index < 1) continue;
  const name = line.slice(0, index);
  let value = line.slice(index + 1);
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  env[name] = value;
}

for (const key of [
  "ARTICLE_PIPELINE_MODE",
  "RAKKO_KEYWORD_LIVE",
  "CLAUDE_ARTICLE_LIVE",
  "OPENAI_IMAGE_LIVE",
  "X_POST_SEARCH_LIVE",
  "RAKKO_REFRESH_INTERVAL_DAYS",
  "ANTHROPIC_MODEL",
  "OPENAI_IMAGE_MODEL",
  "OPENAI_IMAGE_QUALITY",
  "OPENAI_IMAGE_SIZE",
  "CRON_SECRET",
]) {
  const value = env[key];
  if (!value) {
    console.log(`${key}=(unset)`);
  } else if (key.includes("SECRET")) {
    console.log(`${key}=(set length ${value.length})`);
  } else {
    console.log(`${key}=${value}`);
  }
}
