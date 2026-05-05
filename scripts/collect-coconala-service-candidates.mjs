import fs from "fs/promises";
import { nicheConfig } from "../lib/niche-config.js";
import { upsertServiceInventory } from "../lib/service-inventory.js";

await loadEnvFile(".env.local");

const OUTPUT_PATH = "data/coconala-service-candidates.json";
const QUEUE_PATH = "data/a8-coconala-product-link-queue.json";
const MAX_PER_OFFER = Number(process.env.COCONALA_COLLECT_LIMIT_PER_OFFER || 20);

const collectedAt = new Date().toISOString();
const affiliateMaterials = await readJson("data/affiliate-materials.json", []);
const existingServices = await readJson(OUTPUT_PATH, []);
const services = [];

for (const offer of nicheConfig.targetOffers) {
  const products = await collectOfferServices(offer);
  services.push(...products.slice(0, MAX_PER_OFFER));
}

const deduped = mergeExistingAffiliateData(dedupeServices(services), existingServices);
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(deduped, null, 2)}\n`, "utf8");

const queue = buildA8Queue(deduped, affiliateMaterials);
await fs.writeFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, "utf8");

const supabaseResult = process.env.COCONALA_INVENTORY_UPSERT_SUPABASE === "true"
  ? await upsertServiceInventory(deduped, { queuedA8Count: queue.length })
  : { ok: false, reason: "supabase-upsert-disabled" };

console.log(JSON.stringify({
  ok: true,
  collected: deduped.length,
  queue: queue.length,
  supabase: supabaseResult,
  outputPath: OUTPUT_PATH,
  queuePath: QUEUE_PATH,
  offers: summarizeByOffer(deduped),
}, null, 2));

async function collectOfferServices(offer) {
  const keyword = offer.seedKeywords?.[0] || offer.label;
  const sourceUrl = `${offer.categoryUrl}?keyword=${encodeURIComponent(keyword)}`;
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; CoconalaServiceInventoryBot/0.1)",
      "accept-language": "ja,en-US;q=0.8,en;q=0.6",
    },
  });

  if (!response.ok) {
    console.warn(`Failed to fetch ${sourceUrl}: ${response.status}`);
    return [];
  }

  const html = await response.text();
  const products = extractProductsFromJsonLd(html);

  return products.map((product, index) => normalizeProduct(product, offer, index + 1, keyword, sourceUrl));
}

function extractProductsFromJsonLd(html) {
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const products = [];

  for (const match of html.matchAll(scriptPattern)) {
    const raw = decodeHtmlEntities(match[1]).trim();
    const parsed = parseJson(raw);
    if (!parsed) continue;

    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      const itemList = findItemList(node);
      if (!itemList?.itemListElement?.length) continue;

      for (const listItem of itemList.itemListElement) {
        if (listItem?.item?.["@type"] === "Product") {
          products.push(listItem.item);
        }
      }
    }
  }

  return products;
}

function findItemList(node) {
  if (!node || typeof node !== "object") return null;
  if (node["@type"] === "CollectionPage" && node.mainEntity?.["@type"] === "ItemList") return node.mainEntity;
  if (node["@type"] === "ItemList") return node;

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findItemList(item);
        if (found) return found;
      }
    } else if (value && typeof value === "object") {
      const found = findItemList(value);
      if (found) return found;
    }
  }

  return null;
}

function normalizeProduct(product, offer, rank, sourceKeyword, sourceUrl) {
  const serviceUrl = product.url || "";
  const serviceId = serviceUrl.match(/\/services\/(\d+)/)?.[1] || null;
  const rating = product.aggregateRating || {};
  const offerData = product.offers || {};
  const seller = offerData.seller || {};

  return {
    id: serviceId ? `coconala-${serviceId}` : `coconala-${offer.id}-${rank}`,
    serviceId,
    offerId: offer.id,
    product: offer.product,
    targetLabel: offer.label,
    allowedCategory: offer.allowedCategory,
    sourceCategoryUrl: offer.categoryUrl,
    sourceKeyword,
    sourceUrl,
    rank,
    title: cleanText(product.name),
    serviceUrl,
    price: typeof offerData.price === "number" ? offerData.price : Number(offerData.price || 0) || null,
    priceCurrency: offerData.priceCurrency || "JPY",
    availability: offerData.availability || null,
    sellerName: cleanText(seller.name),
    sellerUrl: seller.url || null,
    imageUrl: product.image || null,
    description: cleanText(product.description),
    ratingValue: typeof rating.ratingValue === "number" ? rating.ratingValue : Number(rating.ratingValue || 0) || null,
    reviewCount: typeof rating.reviewCount === "number" ? rating.reviewCount : Number(rating.reviewCount || 0) || null,
    collectedAt,
    affiliateMaterialId: null,
    affiliateStatus: "needs-a8-link",
  };
}

function buildA8Queue(services, materials) {
  const linkedServiceUrls = new Set(
    materials
      .filter((item) => item.href && item.href !== "#")
      .map((item) => item.destinationUrl || item.serviceUrl)
      .filter(Boolean),
  );

  return services
    .filter((service) => service.serviceUrl && !linkedServiceUrls.has(service.serviceUrl))
    .map((service) => ({
      id: `a8-${service.serviceId || service.id}`,
      serviceCandidateId: service.id,
      offerId: service.offerId,
      product: service.product,
      title: service.title,
      linkText: buildSafeLinkText(service),
      destinationUrl: service.serviceUrl,
      imageUrl: service.imageUrl,
      allowedCategory: service.allowedCategory,
      sourceCategoryUrl: service.sourceCategoryUrl,
      status: "pending",
      notes: "A8の商品リンク作成でdestinationUrlを入力し、生成されたHTMLを改変せずSupabaseへ保存する。",
    }));
}

function buildSafeLinkText(service) {
  const base = cleanText(service.title).replace(/[【】\[\]｜|]/g, " ").slice(0, 42).trim();
  return `${base || "ココナラのサービス"}をココナラで確認する`;
}

function dedupeServices(items) {
  const map = new Map();
  for (const item of items) {
    const key = `${item.offerId}:${item.serviceUrl || item.id}`;
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return [...map.values()];
}

function mergeExistingAffiliateData(nextServices, previousServices) {
  const previousById = new Map(previousServices.map((service) => [service.id, service]));

  return nextServices.map((service) => {
    const previous = previousById.get(service.id);
    if (!previous?.affiliateHref && !previous?.affiliateHtml) return service;

    return {
      ...service,
      affiliateMaterialId: previous.affiliateMaterialId || service.affiliateMaterialId,
      affiliateStatus: previous.affiliateStatus || service.affiliateStatus,
      affiliateHtml: previous.affiliateHtml || service.affiliateHtml,
      affiliateHref: previous.affiliateHref || service.affiliateHref,
      affiliateImpressionUrl: previous.affiliateImpressionUrl || service.affiliateImpressionUrl,
      affiliateLinkText: previous.affiliateLinkText || service.affiliateLinkText,
    };
  });
}

function summarizeByOffer(items) {
  return items.reduce((acc, item) => {
    acc[item.offerId] = (acc[item.offerId] || 0) + 1;
    return acc;
  }, {});
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return fallback;
  }
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
