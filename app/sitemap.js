import { readArticles } from "../lib/articles-store";
import { absoluteUrl } from "../lib/site-config";

const STATIC_LAST_MODIFIED = new Date("2026-05-05T00:00:00.000Z");
const fixedPages = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/affiliate-disclosure", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap() {
  const articles = await readArticles();
  const latestArticleDate = articles
    .map((article) => new Date(article.updatedAt || article.publishedAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)[0];

  return [
    ...fixedPages.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: page.path === "/" ? latestArticleDate || STATIC_LAST_MODIFIED : STATIC_LAST_MODIFIED,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/articles/${article.slug}`),
      lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(article.publishedAt),
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  ];
}
