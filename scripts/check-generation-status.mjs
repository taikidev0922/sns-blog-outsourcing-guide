const response = await fetch("https://sns-blog-outsourcing-guide.vercel.app/api/articles", {
  cache: "no-store",
});
const payload = await response.json();
const articles = Array.isArray(payload) ? payload : payload.articles || [];

console.log(JSON.stringify({
  status: response.status,
  articleCount: articles.length,
  latest: articles.slice(0, 5).map((article) => ({
    slug: article.slug,
    title: article.title,
    keyword: article.keyword,
    articleSource: article.articleSource || "fallback",
    xPostSearchStatus: article.xPostSearchStatus || null,
    xPostCount: article.xPosts?.length || 0,
    comparisonItemCount: article.comparisonItems?.length || 0,
    affiliateLinkedCount: (article.comparisonItems || []).filter((item) => item.affiliateMaterial?.href).length,
    affiliateErrorCount: (article.comparisonItems || []).filter((item) => item.affiliateGenerationError).length,
  })),
}, null, 2));
