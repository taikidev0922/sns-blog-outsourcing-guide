export function parseA8TextLink(html) {
  if (!html || typeof html !== "string") {
    return {
      affiliateHtml: "",
      affiliateHref: "",
      impressionUrl: "",
      linkText: "",
    };
  }

  const href = html.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1] || "";
  const linkText = html.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
  const impressionUrl = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)?.[1] || "";

  return {
    affiliateHtml: html,
    affiliateHref: href,
    impressionUrl,
    linkText,
  };
}

export function buildAffiliateMaterialFromService(service) {
  const parsed = parseA8TextLink(service.affiliateHtml || service.affiliate_html);
  const href = service.affiliateHref || service.affiliate_href || parsed.affiliateHref;

  return {
    id: service.id,
    provider: "a8",
    brand: "Coconala",
    product: service.product,
    type: "text",
    label: service.title,
    linkText: service.affiliateLinkText || service.affiliate_link_text || parsed.linkText || "ココナラで詳細を見る",
    href,
    impressionUrl: service.affiliateImpressionUrl || service.affiliate_impression_url || parsed.impressionUrl,
    destinationUrl: service.serviceUrl || service.service_url,
    rel: "nofollow sponsored",
  };
}
