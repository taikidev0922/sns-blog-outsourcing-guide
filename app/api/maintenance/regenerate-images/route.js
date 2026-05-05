import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { readArticles, writeArticles } from "../../../../lib/articles-store";
import { generateImageWithOpenAI } from "../../../../lib/openai-images";

export const maxDuration = 300;

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  const allowedTokens = [process.env.MAINTENANCE_SECRET, process.env.CRON_SECRET, process.env.BLOB_READ_WRITE_TOKEN].filter(Boolean);

  if (!allowedTokens.length || !allowedTokens.some((token) => authHeader === `Bearer ${token}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 0);

  try {
    const articles = await readArticles();
    const targets = limit > 0 ? articles.slice(0, limit) : articles;
    const updatedBySlug = new Map();
    const results = [];

    for (const article of targets) {
      const generatedImage = await generateImageWithOpenAI(article);

      if (!generatedImage?.imageUrl) {
        results.push({
          slug: article.slug,
          ok: false,
          error: generatedImage?.error || "Image generation returned no image URL.",
        });
        continue;
      }

      updatedBySlug.set(article.slug, {
        ...article,
        imageUrl: generatedImage.imageUrl,
        imageSource: generatedImage.source,
        imageModel: generatedImage.model,
        imageRegeneratedAt: new Date().toISOString(),
      });

      results.push({
        slug: article.slug,
        ok: true,
        imageUrl: generatedImage.imageUrl,
        imageModel: generatedImage.model,
      });
    }

    if (updatedBySlug.size) {
      await writeArticles(articles.map((article) => updatedBySlug.get(article.slug) || article));
      revalidatePath("/");
      for (const slug of updatedBySlug.keys()) {
        revalidatePath(`/articles/${slug}`);
      }
    }

    return NextResponse.json({
      ok: results.every((result) => result.ok),
      totalArticles: articles.length,
      targetCount: targets.length,
      updatedCount: updatedBySlug.size,
      results,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
