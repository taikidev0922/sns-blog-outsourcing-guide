import { buildPlanFromKeyword, keywordPlan } from "./article-generator.js";
import { getPipelineConfig } from "./pipeline-mode.js";
import { fetchRakkoKeywordCandidates } from "./rakko-keywords.js";
import { nicheConfig } from "./niche-config.js";
import { getSupabaseAdmin, getSupabaseProjectKey, isSupabaseConfigured } from "./supabase-admin.js";

const DEFAULT_RAKKO_REFRESH_DAYS = 14;
const MAX_RECENT_PRODUCT_REPEAT = 4;
const KEYWORD_TIER_ROTATION = [
  "long-tail-low-competition",
  "middle",
  "head",
  "middle",
  "emerging",
  "long-tail-low-competition",
];
const MIN_CANDIDATES_PER_TIER = 4;

export async function selectKeywordForArticle(existingArticles) {
  if (!isSupabaseConfigured()) {
    return selectFallbackKeyword(existingArticles, "supabase-not-configured");
  }

  const supabase = getSupabaseAdmin();
  const projectKey = getSupabaseProjectKey();
  await ensureSeedKeywords(supabase);

  const targetTier = pickTargetKeywordTier(existingArticles);
  const targetProduct = pickTargetProduct(existingArticles);
  const refreshDecision = await maybeRefreshRakkoKeywords(supabase, existingArticles, targetTier, targetProduct, projectKey);
  const candidate = await pickLeastUsedKeyword(supabase, existingArticles, targetTier, targetProduct, projectKey);

  if (!candidate) {
    return selectFallbackKeyword(existingArticles, "supabase-empty");
  }
  const enriched = enrichKeywordCandidate(candidate, existingArticles);

  return {
    source: enriched.source || "supabase",
    keyword: enriched.keyword,
    metrics: enriched.metrics || {},
    category: enriched.category,
    product: enriched.product,
    intent: enriched.intent,
    offerId: enriched.offerId,
    keywordTier: getKeywordTier(enriched),
    consumedCredit: refreshDecision.consumedCredit || 0,
    refreshStatus: refreshDecision.status,
    refreshWarning: refreshDecision.error || null,
  };
}

export async function markKeywordUsedForArticle(keywordCandidate, article) {
  if (!isSupabaseConfigured() || !keywordCandidate?.keyword) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const projectKey = getSupabaseProjectKey();
  const now = new Date().toISOString();

  await supabase
    .from("keyword_candidates")
    .upsert(
      {
        project_key: projectKey,
        keyword: keywordCandidate.keyword,
        source: keywordCandidate.source || "unknown",
        category: keywordCandidate.category || article.category,
        product: keywordCandidate.product || article.product,
        intent: keywordCandidate.intent || article.intent,
        metrics: {
          ...(keywordCandidate.metrics || {}),
          keywordTier: keywordCandidate.keywordTier || keywordCandidate.metrics?.keywordTier || null,
        },
        last_used_at: now,
      },
      { onConflict: "project_key,keyword" },
    );

  await supabase.rpc("increment_keyword_usage", { target_project_key: projectKey, target_keyword: keywordCandidate.keyword }).then(async ({ error }) => {
    if (!error) return;
    await incrementUsageFallback(supabase, keywordCandidate.keyword, now, projectKey);
  });

  await supabase.from("keyword_usage_events").insert({
    project_key: projectKey,
    keyword: keywordCandidate.keyword,
    article_slug: article.slug,
    article_title: article.title,
    source: keywordCandidate.source || "unknown",
    used_at: now,
  });
}

async function ensureSeedKeywords(supabase) {
  const projectKey = getSupabaseProjectKey();
  const rows = keywordPlan.map((item) => ({
    project_key: projectKey,
    keyword: item.keyword,
    source: "seed",
    category: item.category,
    product: item.product,
    intent: item.intent,
    metrics: { keywordTier: "seed" },
  }));

  await supabase.from("keyword_candidates").upsert(rows, { onConflict: "project_key,keyword", ignoreDuplicates: true });
}

async function maybeRefreshRakkoKeywords(supabase, existingArticles, targetTier, targetProduct, projectKey) {
  const pipeline = getPipelineConfig();

  if (!pipeline.rakkoLive) {
    return { status: `skipped-${pipeline.mode}-mode`, consumedCredit: 0 };
  }

  const intervalDays = Number(process.env.RAKKO_REFRESH_INTERVAL_DAYS || DEFAULT_RAKKO_REFRESH_DAYS);
  const tierCount = await countAvailableKeywordsForTier(supabase, targetTier, targetProduct, existingArticles, projectKey);
  const needsTierInventory = targetTier && tierCount < Number(process.env.RAKKO_MIN_CANDIDATES_PER_TIER || MIN_CANDIDATES_PER_TIER);
  const { data: lastRun } = await supabase
    .from("keyword_refresh_runs")
    .select("created_at")
    .eq("project_key", projectKey)
    .eq("provider", "rakko")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRun?.created_at) {
    const ageMs = Date.now() - new Date(lastRun.created_at).getTime();
    if (!needsTierInventory && ageMs < intervalDays * 24 * 60 * 60 * 1000) {
      return { status: "skipped-too-soon", consumedCredit: 0 };
    }
  }

  const result = await fetchRakkoKeywordCandidates(existingArticles, {
    seedKeyword: pickNextRakkoSeedKeyword(existingArticles, targetProduct),
    profileIds: targetTier ? [targetTier] : undefined,
  });

  if (result.candidates.length) {
    await supabase.from("keyword_candidates").upsert(
      result.candidates.map((candidate) => {
        const enriched = enrichKeywordCandidate({ ...candidate, source: "rakko" }, existingArticles);
        return {
          keyword: enriched.keyword,
          project_key: projectKey,
          source: "rakko",
          category: enriched.category,
          product: enriched.product,
          intent: enriched.intent,
          metrics: enriched.metrics || {},
        };
      }),
      { onConflict: "project_key,keyword", ignoreDuplicates: true },
    );
  }

  await supabase.from("keyword_refresh_runs").insert({
    project_key: projectKey,
    provider: "rakko",
    seed_keyword: targetTier ? `${result.seedKeyword || ""} [${targetTier}]` : result.seedKeyword || null,
    status: result.source === "rakko" ? "success" : "skipped_or_failed",
    fetched_count: result.candidates.length,
    consumed_credit: result.consumedCredit || 0,
    error: result.error || null,
  });

  return {
    status: result.source,
    consumedCredit: result.consumedCredit || 0,
    error: result.error || null,
  };
}

async function pickLeastUsedKeyword(supabase, existingArticles, targetTier, targetProduct, projectKey) {
  const usedKeywords = existingArticles.map((article) => article.keyword);
  const recentProducts = existingArticles.slice(0, MAX_RECENT_PRODUCT_REPEAT).map((article) => article.product).filter(Boolean);
  let query = buildKeywordSelectionQuery(supabase, projectKey);

  if (targetProduct) {
    query = query.eq("product", targetProduct);
  }

  query = applyKeywordSelectionFilters(query, usedKeywords, recentProducts);

  let { data, error } = await query;
  let selected = selectFromCandidateRows(data || [], targetTier, targetProduct, recentProducts);

  if (!selected && targetProduct) {
    let fallbackTargetQuery = buildKeywordSelectionQuery(supabase, projectKey).eq("product", targetProduct);
    fallbackTargetQuery = applyKeywordSelectionFilters(fallbackTargetQuery, usedKeywords, []);
    const fallbackTarget = await fallbackTargetQuery;
    selected = selectFromCandidateRows(fallbackTarget.data || [], targetTier, targetProduct, recentProducts);
    error = fallbackTarget.error;
  }

  if (!selected) {
    let fallbackQuery = buildKeywordSelectionQuery(supabase, projectKey);
    fallbackQuery = applyKeywordSelectionFilters(fallbackQuery, usedKeywords, recentProducts);
    const fallback = await fallbackQuery;
    selected = selectFromCandidateRows(fallback.data || [], targetTier, targetProduct, recentProducts);
    error = fallback.error;
  }

  if (!selected && recentProducts.length) {
    let finalFallbackQuery = buildKeywordSelectionQuery(supabase, projectKey);
    finalFallbackQuery = applyKeywordSelectionFilters(finalFallbackQuery, usedKeywords, []);
    const finalFallback = await finalFallbackQuery;
    selected = selectFromCandidateRows(finalFallback.data || [], targetTier, targetProduct, recentProducts);
    error = finalFallback.error;
  }

  if (error) return null;
  return selected;
}

function buildKeywordSelectionQuery(supabase, projectKey) {
  return supabase
    .from("keyword_candidates")
    .select("*")
    .eq("project_key", projectKey)
    .order("usage_count", { ascending: true })
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .order("discovered_at", { ascending: false })
    .limit(80);
}

function applyKeywordSelectionFilters(query, usedKeywords, recentProducts) {
  if (usedKeywords.length) {
    query = query.not("keyword", "in", `(${usedKeywords.map(escapePostgrestListValue).join(",")})`);
  }

  if (recentProducts.length) {
    query = query.not("product", "in", `(${recentProducts.map(escapePostgrestListValue).join(",")})`);
  }

  return query;
}

function selectFallbackKeyword(existingArticles, reason) {
  const item = keywordPlan[existingArticles.length % keywordPlan.length];
  return {
    source: reason,
    keyword: item.keyword,
    category: item.category,
    product: item.product,
    intent: item.intent,
    offerId: item.offerId,
    metrics: { keywordTier: "seed" },
    keywordTier: "seed",
    consumedCredit: 0,
    refreshStatus: "fallback",
  };
}

function enrichKeywordCandidate(candidate, existingArticles) {
  if (candidate.category && candidate.product && candidate.intent) {
    return candidate;
  }

  const fallbackPlan = keywordPlan[existingArticles.length % keywordPlan.length];
  const plan = buildPlanFromKeyword(candidate.keyword, fallbackPlan);

  return {
    ...candidate,
    category: candidate.category || plan.category,
    product: candidate.product || plan.product,
    intent: candidate.intent || plan.intent,
    offerId: candidate.offerId || plan.offerId,
  };
}

function pickTargetKeywordTier(existingArticles) {
  return KEYWORD_TIER_ROTATION[existingArticles.length % KEYWORD_TIER_ROTATION.length];
}

function pickTargetProduct(existingArticles) {
  const offers = nicheConfig.targetOffers.map((offer) => offer.product).filter(Boolean);
  const uniqueProducts = [...new Set(offers.length ? offers : keywordPlan.map((plan) => plan.product))];
  const recentProducts = new Set(existingArticles.slice(0, MAX_RECENT_PRODUCT_REPEAT).map((article) => article.product).filter(Boolean));
  const usageCounts = existingArticles.reduce((acc, article) => {
    if (article.product) acc[article.product] = (acc[article.product] || 0) + 1;
    return acc;
  }, {});
  const rotationOffset = existingArticles.length % Math.max(uniqueProducts.length, 1);

  return uniqueProducts
    .map((product, index) => ({
      product,
      score: (usageCounts[product] || 0) * 100 + (recentProducts.has(product) ? 60 : 0) + ((index - rotationOffset + uniqueProducts.length) % uniqueProducts.length),
    }))
    .sort((a, b) => a.score - b.score)[0]?.product || null;
}

function selectFromCandidateRows(rows, targetTier, targetProduct, recentProducts = []) {
  if (!rows.length) return null;

  const ranked = rows
    .map((row) => ({ row, score: scoreKeywordCandidate(row, targetTier, targetProduct, recentProducts) }))
    .sort((a, b) => b.score - a.score || Number(a.row.usage_count || 0) - Number(b.row.usage_count || 0));

  return ranked[0]?.row || null;
}

function scoreKeywordCandidate(candidate, targetTier, targetProduct, recentProducts = []) {
  const metrics = candidate.metrics || {};
  const tier = getKeywordTier(candidate);
  const volume = Number(metrics.searchVolume || 0);
  const difficulty = Number(metrics.seoDifficulty || 0);
  const usage = Number(candidate.usage_count || 0);
  const ageBonus = candidate.last_used_at ? 0 : 20;

  let score = 100 - usage * 12 + ageBonus;
  if (targetTier && tier === targetTier) score += 120;
  if (targetProduct && candidate.product === targetProduct) score += 180;
  if (recentProducts.includes(candidate.product)) score -= 140;
  if (tier === "seed") score -= 30;

  if (targetTier === "head") score += Math.min(volume / 20, 80) + Math.min(difficulty, 60) / 3;
  if (targetTier === "middle") score += volume >= 50 && volume <= 500 ? 60 : 0;
  if (targetTier === "long-tail-low-competition") {
    score += volume > 0 && volume <= 150 ? 45 : 0;
    score += difficulty > 0 && difficulty <= 35 ? 45 : 0;
    score += String(candidate.keyword || "").length > 12 ? 15 : 0;
  }
  if (targetTier === "emerging") {
    score += ["last_7_days", "last_30_days", "last_90_days"].includes(metrics.firstSeenRange) ? 80 : 0;
    score += volume > 0 && volume <= 300 ? 25 : 0;
  }

  return score;
}

async function countAvailableKeywordsForTier(supabase, targetTier, targetProduct, existingArticles, projectKey) {
  if (!targetTier) return 0;
  const usedKeywords = existingArticles.map((article) => article.keyword);
  let query = supabase
    .from("keyword_candidates")
    .select("keyword, metrics")
    .eq("project_key", projectKey)
    .limit(80);

  if (usedKeywords.length) {
    query = query.not("keyword", "in", `(${usedKeywords.map(escapePostgrestListValue).join(",")})`);
  }

  if (targetProduct) {
    query = query.eq("product", targetProduct);
  }

  const { data } = await query;
  return (data || []).filter((row) => getKeywordTier(row) === targetTier).length;
}

function getKeywordTier(candidate) {
  const metrics = candidate.metrics || {};
  if (metrics.keywordTier) return metrics.keywordTier;

  const volume = Number(metrics.searchVolume || 0);
  const difficulty = Number(metrics.seoDifficulty || 0);
  const firstSeenRange = metrics.firstSeenRange;

  if (["last_7_days", "last_30_days", "last_90_days"].includes(firstSeenRange)) return "emerging";
  if (volume >= 300) return "head";
  if (volume > 0 && volume <= 150 && difficulty > 0 && difficulty <= 35) return "long-tail-low-competition";
  if (volume >= 50 && volume < 300) return "middle";
  return "middle";
}

function pickNextRakkoSeedKeyword(existingArticles, targetProduct = null) {
  if (targetProduct) {
    const targetOffer = nicheConfig.targetOffers.find((offer) => offer.product === targetProduct);
    const seeds = targetOffer?.seedKeywords || keywordPlan.filter((plan) => plan.product === targetProduct).map((plan) => plan.keyword);
    if (seeds.length) {
      return seeds[existingArticles.length % seeds.length];
    }
  }

  const recentProducts = new Set(existingArticles.slice(0, 3).map((article) => article.product).filter(Boolean));
  const preferred = keywordPlan.find((plan) => !recentProducts.has(plan.product));
  return preferred?.keyword || keywordPlan[existingArticles.length % keywordPlan.length]?.keyword;
}

async function incrementUsageFallback(supabase, keyword, now, projectKey) {
  const { data } = await supabase
    .from("keyword_candidates")
    .select("usage_count")
    .eq("project_key", projectKey)
    .eq("keyword", keyword)
    .maybeSingle();

  await supabase
    .from("keyword_candidates")
    .update({
      usage_count: Number(data?.usage_count || 0) + 1,
      last_used_at: now,
    })
    .eq("project_key", projectKey)
    .eq("keyword", keyword);
}

function escapePostgrestListValue(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}
