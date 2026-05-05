import { getSupabaseAdmin, getSupabaseProjectKey, isSupabaseConfigured } from "./supabase-admin.js";

export async function getPopularArticles(articles, limit = 3) {
  const fallback = articles.slice(0, limit);
  if (!isSupabaseConfigured() || !articles.length) return fallback;

  const supabase = getSupabaseAdmin();
  const projectKey = getSupabaseProjectKey();
  const slugs = articles.map((article) => article.slug).filter(Boolean);
  const { data, error } = await supabase
    .from("article_page_view_counts")
    .select("article_slug, view_count, last_viewed_at")
    .eq("project_key", projectKey)
    .in("article_slug", slugs)
    .order("view_count", { ascending: false })
    .order("last_viewed_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return fallback;

  const articleBySlug = new Map(articles.map((article) => [article.slug, article]));
  const ranked = data
    .map((row) => articleBySlug.get(row.article_slug))
    .filter(Boolean);

  if (ranked.length >= limit) return ranked;

  const used = new Set(ranked.map((article) => article.slug));
  return [
    ...ranked,
    ...articles.filter((article) => !used.has(article.slug)).slice(0, limit - ranked.length),
  ];
}
