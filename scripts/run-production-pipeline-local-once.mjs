import fs from "fs/promises";

import { applyGeneratedArticleContent, buildDummyArticle } from "../lib/article-generator.js";
import { appendArticle, readArticles } from "../lib/articles-store.js";
import { generateArticleWithClaude } from "../lib/claude-articles.js";
import { markKeywordUsedForArticle, selectKeywordForArticle } from "../lib/keyword-store.js";
import { getPipelineConfig } from "../lib/pipeline-mode.js";
import { fetchOfficialProductContext } from "../lib/official-sources.js";
import {
  attachGeneratedAffiliateLinks,
  markServicesUsedForArticle,
  selectServicesForArticle,
} from "../lib/service-inventory.js";
import { fetchRelatedXPosts } from "../lib/x-posts.js";

await loadEnvFile(".env.local");
process.env.ARTICLE_PIPELINE_MODE = "production";
process.env.RAKKO_KEYWORD_LIVE ||= "true";
process.env.CLAUDE_ARTICLE_LIVE ||= "true";
process.env.X_POST_SEARCH_LIVE ||= "true";

const pipeline = getPipelineConfig();
const existingArticles = await readArticles();
const keywordCandidate = await selectKeywordForArticle(existingArticles);
const selectedServices = await selectServicesForArticle(keywordCandidate, existingArticles);
const comparisonItems = await attachGeneratedAffiliateLinks(selectedServices);
const officialContext = await fetchOfficialProductContext(keywordCandidate);
const xPostContext = await fetchRelatedXPosts(keywordCandidate, pipeline);
const baseArticle = buildDummyArticle(existingArticles, keywordCandidate, officialContext, comparisonItems);
const generatedContent = await generateArticleWithClaude(keywordCandidate, existingArticles, officialContext, comparisonItems);
const article = applyGeneratedArticleContent(
  {
    ...baseArticle,
    xPosts: xPostContext.posts || [],
    xPostSearchStatus: xPostContext.status,
    xPostConsumedReads: xPostContext.consumedReads || 0,
  },
  generatedContent,
);

const result = await appendArticle(article);
await markKeywordUsedForArticle(keywordCandidate, article);
await markServicesUsedForArticle(comparisonItems, article);

const affiliateErrors = comparisonItems
  .filter((item) => item.affiliateGenerationError)
  .map((item) => ({ serviceUrl: item.serviceUrl, error: item.affiliateGenerationError }));

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: pipeline.mode,
      slug: article.slug,
      title: article.title,
      keyword: article.keyword,
      keywordSource: keywordCandidate.source,
      keywordRefreshStatus: keywordCandidate.refreshStatus,
      consumedCredit: keywordCandidate.consumedCredit || 0,
      articleSource: generatedContent?.source || "fallback",
      xPostSearchStatus: xPostContext.status,
      xPostCount: xPostContext.posts?.length || 0,
      xPostConsumedReads: xPostContext.consumedReads || 0,
      comparisonItemCount: comparisonItems.length,
      affiliateLinkStatus: {
        requestedCount: comparisonItems.length,
        linkedCount: comparisonItems.filter((item) => item.affiliateMaterial?.href).length,
        errorCount: affiliateErrors.length,
        errors: affiliateErrors,
      },
      totalArticles: result.articles.length,
      warning: keywordCandidate.refreshWarning || generatedContent?.error || null,
      url: `https://sns-blog-outsourcing-guide.vercel.app/articles/${article.slug}`,
    },
    null,
    2,
  ),
);

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
