import { NextResponse } from "next/server";
import { readArticles } from "../../../lib/articles-store";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const articles = await readArticles();

    if (slug) {
      const article = articles.find((entry) => entry.slug === slug);
      return NextResponse.json({ article: article || null }, { status: article ? 200 : 404 });
    }

    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
