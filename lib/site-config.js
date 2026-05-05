import { nicheConfig } from "./niche-config.js";

export const siteConfig = {
  name: nicheConfig.siteName,
  shortName: nicheConfig.shortName,
  description: nicheConfig.siteDescription,
  url: nicheConfig.siteUrl,
  locale: nicheConfig.locale,
  language: nicheConfig.language,
  metaTitle: nicheConfig.metaTitle,
  logoSubtitle: nicheConfig.logoSubtitle,
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteConfig.url).toString();
}
