import fs from "fs/promises";

import { del, list, put } from "@vercel/blob";
import { getSupabaseAdmin, getSupabaseProjectKey } from "../lib/supabase-admin.js";

await loadEnvFile(".env.local");

const report = {
  blob: {},
  supabase: {},
  local: {},
};

await resetArticlesBlob();
await resetXPostCache();
await resetLocalArticles();
await resetSupabaseTables();

console.log(JSON.stringify(report, null, 2));

async function resetArticlesBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    report.blob.articles = "skipped-missing-token";
    return;
  }

  await put("cms/articles.json", "[]\n", {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  });
  report.blob.articles = "cleared";
}

async function resetXPostCache() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    report.blob.xPosts = "skipped-missing-token";
    return;
  }

  const removed = [];
  let cursor;
  do {
    const result = await list({ prefix: "cms/x-posts/", cursor, limit: 100 });
    const pathnames = result.blobs.map((blob) => blob.pathname);
    if (pathnames.length) {
      await del(pathnames);
      removed.push(...pathnames);
    }
    cursor = result.cursor;
  } while (cursor);

  report.blob.xPosts = { removedCount: removed.length };
}

async function resetLocalArticles() {
  await fs.writeFile("data/articles.json", "[]\n", "utf8").catch(() => {});
  report.local.articles = "cleared";
}

async function resetSupabaseTables() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    report.supabase = "skipped-missing-env";
    return;
  }

  await clearProjectRows(supabase, "article_page_view_events", "id");
  await clearProjectRows(supabase, "article_page_view_counts", "article_slug");
  await clearProjectRows(supabase, "coconala_service_usage_log", "id");
  await clearProjectRows(supabase, "coconala_service_usage", "service_url");
  await clearProjectRows(supabase, "keyword_usage_events", "id");
  await clearProjectRows(supabase, "keyword_refresh_runs", "id");
  await clearProjectRows(supabase, "keyword_candidates", "keyword");
}

async function clearProjectRows(supabase, table, column) {
  const projectKey = getSupabaseProjectKey();
  const { count: before } = await supabase
    .from(table)
    .select(column, { count: "exact", head: true })
    .eq("project_key", projectKey);

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("project_key", projectKey);

  const { count: after } = await supabase
    .from(table)
    .select(column, { count: "exact", head: true })
    .eq("project_key", projectKey);

  report.supabase[table] = {
    projectKey,
    before: before ?? null,
    after: after ?? null,
    error: error?.message || null,
  };
}

async function loadEnvFile(path) {
  const raw = await fs.readFile(path, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
