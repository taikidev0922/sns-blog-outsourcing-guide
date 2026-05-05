import fs from "fs/promises";
import { selectServicesForArticle, attachGeneratedAffiliateLinks } from "../lib/service-inventory.js";

await loadEnvFile(".env.local");

const keywordCandidate = {
  keyword: "ブログ ロゴ 依頼",
  category: "request",
  product: "blog-logo",
  intent: "brief",
  offerId: "blog-logo",
};

const selectedServices = await selectServicesForArticle(keywordCandidate, [], 1);
const linkedServices = await attachGeneratedAffiliateLinks(selectedServices);

console.log(JSON.stringify({
  selectedCount: selectedServices.length,
  linkedCount: linkedServices.filter((item) => item.affiliateMaterial?.href).length,
  results: linkedServices.map((item) => ({
    title: item.title,
    serviceUrl: item.serviceUrl,
    affiliateStatus: item.affiliateStatus,
    hasAffiliateHref: Boolean(item.affiliateHref),
    error: item.affiliateGenerationError || null,
  })),
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
