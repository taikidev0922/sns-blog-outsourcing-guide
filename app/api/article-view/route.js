import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseProjectKey, isSupabaseConfigured } from "../../../lib/supabase-admin";

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "supabase-not-configured" }, { status: 202 });
  }

  const payload = await request.json().catch(() => ({}));
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";

  if (!slug || slug.length > 180) {
    return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("increment_article_page_view", {
    target_project_key: getSupabaseProjectKey(),
    target_slug: slug,
    target_referrer: request.headers.get("referer"),
    target_user_agent: request.headers.get("user-agent"),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
