import fs from "fs/promises";
import { applyGeneratedArticleContent, buildDummyArticle } from "../lib/article-generator.js";
import { appendArticle, readArticles } from "../lib/articles-store.js";
import { generateArticleWithClaude } from "../lib/claude-articles.js";
import { fetchOfficialProductContext } from "../lib/official-sources.js";
import { generateImageWithOpenAI } from "../lib/openai-images.js";
import { selectKeywordForArticle } from "../lib/keyword-store.js";
import { attachGeneratedAffiliateLinks, markServicesUsedForArticle, selectServicesForArticle } from "../lib/service-inventory.js";

await loadEnvFile(".env.local");

process.env.ARTICLE_PIPELINE_MODE = "test";
process.env.TEST_CLAUDE_ARTICLE_LIVE = "true";
process.env.TEST_CLAUDE_MAX_TOKENS ||= "3200";
process.env.TEST_ANTHROPIC_MODEL ||= process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
process.env.TEST_OPENAI_IMAGE_LIVE ||= "false";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required to preview Claude article generation.");
}

const before = await readArticles();
const keywordCandidate = await selectKeywordForArticle(before);
const selectedServices = await selectServicesForArticle(keywordCandidate, before);
const comparisonItems = await attachGeneratedAffiliateLinks(selectedServices);
const officialContext = await fetchOfficialProductContext(keywordCandidate);
const baseArticle = buildDummyArticle(before, keywordCandidate, officialContext, comparisonItems);
const generatedContent = await generateArticleWithClaude(keywordCandidate, before, officialContext, comparisonItems);

let article = applyGeneratedArticleContent(baseArticle, generatedContent);
const generatedImage = await generateImageWithOpenAI(article);

if (generatedImage?.imageUrl) {
  article = {
    ...article,
    imageUrl: generatedImage.imageUrl,
    imageSource: generatedImage.source,
    imageModel: generatedImage.model,
  };
}

const result = await appendArticle(article);
await markServicesUsedForArticle(comparisonItems, article);

console.log(JSON.stringify({
  ok: generatedContent?.source === "claude",
  slug: article.slug,
  title: article.title,
  keyword: article.keyword,
  articleSource: generatedContent?.source || "fallback",
  articleError: generatedContent?.error || null,
  rawTextSnippet: generatedContent?.rawTextSnippet || null,
  model: process.env.TEST_ANTHROPIC_MODEL,
  comparisonItemCount: comparisonItems.length,
  qualityScore: article.quality?.score || 0,
  totalArticles: result.articles.length,
  localUrl: `http://127.0.0.1:3000/articles/${article.slug}`,
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
