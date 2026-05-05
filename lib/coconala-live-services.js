export async function collectCurrentOfferServices(offer, { limit = 12 } = {}) {
  if (!offer?.categoryUrl) return [];

  const keyword = offer.seedKeywords?.[0] || offer.label;
  const sourceUrl = `${offer.categoryUrl}?keyword=${encodeURIComponent(keyword)}`;
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; CoconalaServicePicker/0.1)",
      "accept-language": "ja,en-US;q=0.8,en;q=0.6",
    },
    cache: "no-store",
  });

  if (!response.ok) return [];

  const html = await response.text();
  const products = extractProductsFromJsonLd(html);
  const collectedAt = new Date().toISOString();

  return products
    .slice(0, limit)
    .map((product, index) => normalizeProduct(product, offer, index + 1, keyword, sourceUrl, collectedAt))
    .filter((service) => service.serviceUrl);
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

function normalizeProduct(product, offer, rank, sourceKeyword, sourceUrl, collectedAt) {
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
  };
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
