import fs from "fs/promises";
import { selectKeywordForArticle } from "../lib/keyword-store.js";

await loadEnvFile(".env.local");

const keyword = await selectKeywordForArticle([]);
console.log(JSON.stringify({
  source: keyword.source,
  keyword: keyword.keyword,
  refreshStatus: keyword.refreshStatus,
  consumedCredit: keyword.consumedCredit,
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
