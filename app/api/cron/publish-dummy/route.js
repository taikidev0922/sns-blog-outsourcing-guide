import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { applyGeneratedArticleContent, buildDummyArticle } from "../../../../lib/article-generator";
import { appendArticle, readArticles } from "../../../../lib/articles-store";
import { generateArticleWithClaude } from "../../../../lib/claude-articles";
import { markKeywordUsedForArticle, selectKeywordForArticle } from "../../../../lib/keyword-store";
import { generateImageWithOpenAI } from "../../../../lib/openai-images";
import { getPipelineConfig } from "../../../../lib/pipeline-mode";
import { fetchOfficialProductContext } from "../../../../lib/official-sources";
import { attachGeneratedAffiliateLinks, markServicesUsedForArticle, selectServicesForArticle } from "../../../../lib/service-inventory";
import { fetchRelatedXPosts } from "../../../../lib/x-posts";

export const maxDuration = 300;

export async function GET(request) {
  return publishDummyArticle(request);
}

export async function POST(request) {
  return publishDummyArticle(request);
}

async function publishDummyArticle(request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pipeline = getPipelineConfig();
    const existingArticles = await readArticles();
    const targetArticleCount = Number(process.env.BOOTSTRAP_TARGET_ARTICLE_COUNT || 0);

    if (targetArticleCount > 0 && existingArticles.length >= targetArticleCount) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "target-article-count-reached",
        mode: pipeline.mode,
        totalArticles: existingArticles.length,
        targetArticleCount,
        nextStep: "Set BOOTSTRAP_TARGET_ARTICLE_COUNT to 0 and change the cron schedule for daily production publishing.",
      });
    }

    const maxAttempts = Math.max(1, Number(process.env.CRON_GENERATION_ATTEMPTS || 3));
    const attemptedArticles = [...existingArticles];
    const failures = [];

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await generateAndPublishArticle({
        pipeline,
        existingArticles: attemptedArticles,
        attempt,
        maxAttempts,
      });

      if (result.ok) {
        return NextResponse.json(result.response);
      }

      failures.push(result.failure);
      if (result.keywordCandidate?.keyword) {
        attemptedArticles.unshift({
          keyword: result.keywordCandidate.keyword,
          product: result.keywordCandidate.product,
          publishedAt: new Date().toISOString(),
        });
      }
    }

    console.warn("Cron article generation failed after retries", JSON.stringify({ failures }));
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "article-generation-retries-exhausted",
      attempts: failures.length,
      failures,
    }, { status: 422 });
  } catch (error) {
    const status = error.code === "STORAGE_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ ok: false, error: error.message }, { status });
  }
}

async function generateAndPublishArticle({ pipeline, existingArticles, attempt, maxAttempts }) {
  const keywordCandidate = await selectKeywordForArticle(existingArticles);
  const selectedServices = await selectServicesForArticle(keywordCandidate, existingArticles);
  const comparisonItems = await attachGeneratedAffiliateLinks(selectedServices);
  const affiliateLinkStatus = buildAffiliateLinkStatus(comparisonItems);
  const officialContext = await fetchOfficialProductContext(keywordCandidate);
  const xPostContext = await fetchRelatedXPosts(keywordCandidate, pipeline);
  const baseArticle = buildDummyArticle(existingArticles, keywordCandidate, officialContext, comparisonItems);
  const generatedContent = await generateArticleWithClaude(keywordCandidate, existingArticles, officialContext, comparisonItems);
  let article = applyGeneratedArticleContent({
    ...baseArticle,
    xPosts: xPostContext.posts || [],
    xPostSearchStatus: xPostContext.status,
    xPostConsumedReads: xPostContext.consumedReads || 0,
  }, generatedContent);
  const generatedImage = await generateImageWithOpenAI(article);
  const qualityScore = article.quality?.score || 0;
  const minimumQualityScore = Number(process.env.MIN_ARTICLE_QUALITY_SCORE || 70);

  if (pipeline.mode === "production" && qualityScore < minimumQualityScore) {
    const failure = {
      reason: "article-quality-too-low",
      attempt,
      keyword: keywordCandidate.keyword,
      qualityScore,
      minimumQualityScore,
      qualityChecks: article.quality?.checks || [],
    };
    console.warn("Cron article generation attempt failed", JSON.stringify(failure));
    return { ok: false, keywordCandidate, failure };
  }

  if (generatedImage?.imageUrl) {
    article = {
      ...article,
      imageUrl: generatedImage.imageUrl,
      imageSource: generatedImage.source,
      imageModel: generatedImage.model,
    };
  }

  const readiness = validateProductionArticleReadiness({
    pipeline,
    comparisonItems,
    xPostContext,
    generatedContent,
    generatedImage,
  });

  if (!readiness.ok) {
    const failure = {
      reason: "article-readiness-check-failed",
      attempt,
      keyword: keywordCandidate.keyword,
      checks: readiness.checks,
      affiliateLinkStatus,
      articleSource: generatedContent?.source || "fallback",
      imageSource: generatedImage?.source || "fallback",
      xPostSearchStatus: xPostContext.status,
      xPostCount: xPostContext.posts?.length || 0,
    };
    console.warn("Cron article generation attempt failed", JSON.stringify(failure));
    return { ok: false, keywordCandidate, failure };
  }

  const result = await appendArticle(article);
  await markKeywordUsedForArticle(keywordCandidate, article);
  await markServicesUsedForArticle(comparisonItems, article);

  revalidatePath("/");
  revalidatePath(`/articles/${article.slug}`);

  return {
    ok: true,
    response: {
      ok: true,
      mode: pipeline.mode,
      created: article,
      totalArticles: result.articles.length,
      attempt,
      maxAttempts,
      keywordSource: keywordCandidate?.source || "fallback",
      consumedCredit: keywordCandidate?.consumedCredit || 0,
      keywordRefreshStatus: keywordCandidate?.refreshStatus || null,
      articleSource: generatedContent?.source || "fallback",
      imageSource: generatedImage?.source || "fallback",
      officialSourceCount: officialContext.sources?.length || 0,
      officialSourceCache: officialContext.cache || null,
      xPostSearchStatus: xPostContext.status,
      xPostCount: xPostContext.posts?.length || 0,
      xPostConsumedReads: xPostContext.consumedReads || 0,
      comparisonItemCount: comparisonItems.length,
      affiliateLinkStatus,
      qualityScore,
      qualityChecks: article.quality?.checks || [],
      warning: keywordCandidate?.refreshWarning || generatedContent?.error || generatedImage?.error || affiliateLinkStatus.warning || null,
      providerConfig: {
        rakkoLive: pipeline.rakkoLive,
        claudeLive: pipeline.claudeLive,
        openaiImageLive: pipeline.openaiImageLive,
        xPostSearchLive: pipeline.xPostSearchLive,
        anthropicModel: pipeline.claudeLive ? pipeline.anthropicModel : null,
        openaiImageModel: pipeline.openaiImageLive ? pipeline.openaiImageModel : null,
      },
      nextStep: "Switch ARTICLE_PIPELINE_MODE from test to production when ready for full production behavior.",
    },
  };
}

function validateProductionArticleReadiness({ pipeline, comparisonItems, xPostContext, generatedContent, generatedImage }) {
  if (pipeline.mode !== "production") {
    return { ok: true, checks: [] };
  }

  const requiredAffiliateLinks = Number(process.env.MIN_AFFILIATE_LINKED_COUNT || 3);
  const requiredXPosts = Number(process.env.MIN_X_POST_COUNT || (pipeline.xPostSearchLive ? 1 : 0));
  const requireClaude = process.env.REQUIRE_CLAUDE_ARTICLE !== "false";
  const requireGeneratedImage = process.env.REQUIRE_GENERATED_IMAGE === "true" || pipeline.openaiImageLive;
  const linkedCount = comparisonItems.filter((item) => item.affiliateMaterial?.href).length;
  const xPostCount = xPostContext.posts?.length || 0;

  const checks = [
    {
      name: "claude-article",
      passed: !requireClaude || generatedContent?.source === "claude",
      required: requireClaude,
      actual: generatedContent?.source || "fallback",
    },
    {
      name: "affiliate-links",
      passed: linkedCount >= requiredAffiliateLinks,
      required: requiredAffiliateLinks,
      actual: linkedCount,
    },
    {
      name: "x-posts",
      passed: xPostCount >= requiredXPosts,
      required: requiredXPosts,
      actual: xPostCount,
    },
    {
      name: "generated-image",
      passed: !requireGeneratedImage || Boolean(generatedImage?.imageUrl),
      required: requireGeneratedImage,
      actual: generatedImage?.source || "fallback",
    },
  ];

  return {
    ok: checks.every((check) => check.passed),
    checks,
  };
}

function buildAffiliateLinkStatus(comparisonItems) {
  const linkedCount = comparisonItems.filter((item) => item.affiliateMaterial?.href).length;
  const errors = comparisonItems
    .filter((item) => item.affiliateGenerationError)
    .map((item) => ({
      serviceUrl: item.serviceUrl,
      error: item.affiliateGenerationError,
    }));

  return {
    requestedCount: comparisonItems.length,
    linkedCount,
    errorCount: errors.length,
    errors,
    warning: errors.length ? `A8 product link generation failed for ${errors.length} service(s).` : null,
  };
}
