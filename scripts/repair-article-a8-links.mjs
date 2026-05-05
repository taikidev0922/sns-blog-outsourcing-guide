import fs from "fs/promises";
import { readArticles, writeArticles } from "../lib/articles-store.js";
import { attachGeneratedAffiliateLinks } from "../lib/service-inventory.js";

await loadEnvFile(".env.local");

const slug = process.argv[2];
if (!slug) {
  throw new Error("Usage: node scripts/repair-article-a8-links.mjs <article-slug>");
}

const articles = await readArticles();
const target = articles.find((article) => article.slug === slug);
if (!target) {
  throw new Error(`Article not found: ${slug}`);
}

const beforeLinkedCount = (target.comparisonItems || []).filter((item) => item.affiliateMaterial?.href).length;
const comparisonItems = await attachGeneratedAffiliateLinks(target.comparisonItems || []);
const afterLinkedCount = comparisonItems.filter((item) => item.affiliateMaterial?.href).length;

const updatedArticles = articles.map((article) => {
  if (article.slug !== slug) return article;
  return {
    ...article,
    comparisonItems,
    affiliateCta: updateAffiliateCta(article.affiliateCta, comparisonItems),
  };
});

await writeArticles(updatedArticles);

console.log(JSON.stringify({
  slug,
  beforeLinkedCount,
  afterLinkedCount,
  errors: comparisonItems
    .filter((item) => item.affiliateGenerationError)
    .map((item) => ({ serviceUrl: item.serviceUrl, error: item.affiliateGenerationError })),
}, null, 2));

function updateAffiliateCta(cta, comparisonItems) {
  const firstMaterial = comparisonItems.find((item) => item.affiliateMaterial?.href)?.affiliateMaterial;
  if (!firstMaterial) return cta;

  return {
    ...cta,
    buttonText: cta?.buttonText || "ココナラで詳細を見る",
    url: firstMaterial.href,
    destinationUrl: firstMaterial.destinationUrl || cta?.destinationUrl,
  };
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
