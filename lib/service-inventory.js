import { parseA8TextLink, buildAffiliateMaterialFromService } from "./a8-link-parser.js";
import { collectCurrentOfferServices } from "./coconala-live-services.js";
import { findTargetOffer } from "./article-generator.js";
import { getSupabaseAdmin, getSupabaseProjectKey, isSupabaseConfigured } from "./supabase-admin.js";

const DEFAULT_COMPARISON_LIMIT = 3;
const LIVE_FETCH_LIMIT = Number(process.env.COCONALA_LIVE_CANDIDATE_LIMIT || 12);

export async function selectServicesForArticle(keywordCandidate, existingArticles = [], limit = DEFAULT_COMPARISON_LIMIT) {
  const offer = findTargetOffer(keywordCandidate?.offerId || keywordCandidate?.product);
  if (!offer) return [];

  const liveServices = await collectCurrentOfferServices(offer, { limit: LIVE_FETCH_LIMIT });
  const usageByUrl = isSupabaseConfigured()
    ? await fetchUsageByServiceUrl(liveServices.map((service) => service.serviceUrl))
    : buildLocalUsageByUrl(existingArticles);

  return liveServices
    .map((service) => ({
      ...service,
      usageCount: usageByUrl.get(service.serviceUrl)?.usageCount || 0,
      lastUsedAt: usageByUrl.get(service.serviceUrl)?.lastUsedAt || null,
      affiliateStatus: "needs-a8-link",
    }))
    .sort(compareServiceCandidates)
    .slice(0, limit)
    .map(normalizeServiceForArticle);
}

export async function attachGeneratedAffiliateLinks(services) {
  if (!services?.length) return [];
  if (services.every((service) => service.affiliateMaterial?.href)) return services;
  if (!process.env.A8_LOGIN_ID || !process.env.A8_PASSWORD) return services;

  let generated = [];
  try {
    const { generateA8TextLinksForServices } = await import("./a8-browser-links.js");
    generated = await generateA8TextLinksForServices(services);
  } catch (error) {
    return services.map((service) => ({
      ...service,
      affiliateStatus: "a8-generation-error",
      affiliateGenerationError: error.message,
    }));
  }

  const generatedByUrl = new Map(generated.map((item) => [item.serviceUrl, item]));

  return services.map((service) => {
    const link = generatedByUrl.get(service.serviceUrl);
    if (link?.error) {
      return {
        ...service,
        affiliateStatus: "a8-generation-error",
        affiliateGenerationError: link.error,
      };
    }
    if (!link?.affiliateHtml) return service;

    const parsed = parseA8TextLink(link.affiliateHtml);
    const withLink = {
      ...service,
      affiliateHtml: link.affiliateHtml,
      affiliateHref: parsed.affiliateHref,
      affiliateImpressionUrl: parsed.impressionUrl,
      affiliateLinkText: parsed.linkText,
      affiliateStatus: "linked",
      affiliateGenerationError: null,
    };

    return {
      ...withLink,
      affiliateMaterial: buildAffiliateMaterialFromService(withLink),
    };
  });
}

export async function markServicesUsedForArticle(services, article) {
  if (!isSupabaseConfigured() || !services?.length || !article?.slug) return;

  const supabase = getSupabaseAdmin();
  const projectKey = getSupabaseProjectKey();
  for (const service of services) {
    if (!service?.serviceUrl) continue;

    await supabase.rpc("increment_coconala_service_url_usage", {
      target_project_key: projectKey,
      target_service_url: service.serviceUrl,
      target_service_id: service.serviceId || null,
      target_offer_id: service.offerId,
      target_product: service.product,
      target_title: service.title,
    });

    await supabase.from("coconala_service_usage_log").insert({
      project_key: projectKey,
      service_url: service.serviceUrl,
      service_id: service.serviceId || null,
      article_slug: article.slug,
      article_title: article.title,
      offer_id: service.offerId,
      product: service.product,
      used_at: new Date().toISOString(),
    });
  }
}

// Kept for older scripts; the production path no longer stores a large service inventory.
export async function upsertServiceInventory() {
  return { ok: false, reason: "inventory-disabled-use-live-selection" };
}

async function fetchUsageByServiceUrl(urls) {
  if (!urls.length) return new Map();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coconala_service_usage")
    .select("service_url,usage_count,last_used_at")
    .eq("project_key", getSupabaseProjectKey())
    .in("service_url", urls);

  if (error || !data?.length) return new Map();

  return new Map(data.map((row) => [
    row.service_url,
    {
      usageCount: Number(row.usage_count || 0),
      lastUsedAt: row.last_used_at,
    },
  ]));
}

function buildLocalUsageByUrl(existingArticles) {
  const usage = new Map();
  for (const article of existingArticles) {
    for (const item of article.comparisonItems || []) {
      if (!item.serviceUrl) continue;
      const current = usage.get(item.serviceUrl) || { usageCount: 0, lastUsedAt: null };
      usage.set(item.serviceUrl, {
        usageCount: current.usageCount + 1,
        lastUsedAt: article.publishedAt || current.lastUsedAt,
      });
    }
  }
  return usage;
}

function compareServiceCandidates(a, b) {
  return (
    (a.usageCount || 0) - (b.usageCount || 0) ||
    compareNullableDate(a.lastUsedAt, b.lastUsedAt) ||
    (b.reviewCount || 0) - (a.reviewCount || 0) ||
    (a.rank || 999) - (b.rank || 999)
  );
}

function compareNullableDate(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function normalizeServiceForArticle(service) {
  const material = buildAffiliateMaterialFromService(service);

  return {
    id: service.id,
    serviceId: service.serviceId,
    offerId: service.offerId,
    product: service.product,
    title: service.title,
    sellerName: service.sellerName,
    serviceUrl: service.serviceUrl,
    price: service.price,
    priceCurrency: service.priceCurrency || "JPY",
    ratingValue: service.ratingValue,
    reviewCount: service.reviewCount,
    imageUrl: service.imageUrl,
    description: service.description,
    collectedAt: service.collectedAt,
    usageCount: service.usageCount || 0,
    lastUsedAt: service.lastUsedAt || null,
    affiliateStatus: service.affiliateStatus || "needs-a8-link",
    affiliateHtml: service.affiliateHtml || null,
    affiliateHref: service.affiliateHref || null,
    affiliateImpressionUrl: service.affiliateImpressionUrl || null,
    affiliateLinkText: service.affiliateLinkText || null,
    affiliateMaterial: material.href ? material : null,
    affiliateGenerationError: service.affiliateGenerationError || null,
  };
}
