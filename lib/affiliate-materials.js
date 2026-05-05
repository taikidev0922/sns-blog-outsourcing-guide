import materials from "../data/affiliate-materials.json";
import { nicheConfig } from "./niche-config.js";

export function getAffiliateMaterial({ product, category } = {}) {
  return findAffiliateMaterial({ product, category });
}

export function findAffiliateMaterial({ product, category, placement, type } = {}) {
  const candidates = materials.filter((item) => {
    if (type && item.type !== type) return false;
    if (placement && !item.placement?.includes(placement)) return false;
    return true;
  });

  return (
    candidates.find((item) => item.product === product && item.categories?.includes(category)) ||
    candidates.find((item) => item.product === product) ||
    candidates.find((item) => item.categories?.includes(category)) ||
    candidates.find((item) => item.product === "general") ||
    null
  );
}

export function getAffiliateUrl(context = {}) {
  const materialHref = findAffiliateMaterial(context)?.href;
  if (materialHref && materialHref !== "#") return materialHref;
  return process.env[nicheConfig.affiliate.fallbackUrlEnv] || nicheConfig.affiliate.fallbackUrl;
}

export function getAllAffiliateMaterials() {
  return materials;
}
