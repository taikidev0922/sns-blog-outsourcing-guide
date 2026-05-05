export function articleHref(slug) {
  return `/articles/${slug}`;
}

export function resolveRelatedArticles(article, articles) {
  return [...articles]
    .filter((entry) => entry.slug !== article.slug)
    .map((entry) => ({
      ...entry,
      score:
        Number(entry.product === article.product) * 4 +
        Number(entry.category === article.category) * 3 +
        Number(entry.intent === article.intent) * 2,
    }))
    .sort((a, b) => b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 3);
}
