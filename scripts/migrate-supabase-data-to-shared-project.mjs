import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";

const SOURCE_ENV_FILE = process.env.SOURCE_ENV_FILE || ".env.local";
const TARGET_ENV_FILE = process.env.TARGET_ENV_FILE || "C:\\Users\\taiki\\dev\\switchbot-life-guide\\.env.local";
const PROJECT_KEY = process.env.SUPABASE_PROJECT_KEY || "sns-blog-outsourcing-guide";

const sourceEnv = await readEnvFile(SOURCE_ENV_FILE);
const targetEnv = await readEnvFile(TARGET_ENV_FILE);

const source = createSupabaseClient(sourceEnv, "source");
const target = createSupabaseClient(targetEnv, "target");

const report = {};

await copyKeywordCandidates();
await copyKeywordUsageEvents();
await copyKeywordRefreshRuns();
await copyCoconalaServiceUsage();
await copyCoconalaServiceUsageLog();
await copyArticlePageViewCounts();
await copyArticlePageViewEvents();

console.log(JSON.stringify({ projectKey: PROJECT_KEY, report }, null, 2));

async function copyKeywordCandidates() {
  const rows = await readAll(source, "keyword_candidates", "keyword,source,category,product,intent,metrics,usage_count,last_used_at,discovered_at,created_at,updated_at");
  const payload = rows.map((row) => ({ ...row, project_key: PROJECT_KEY }));
  report.keyword_candidates = await upsertRows("keyword_candidates", payload, "project_key,keyword");
}

async function copyKeywordUsageEvents() {
  const rows = await readAll(source, "keyword_usage_events", "keyword,article_slug,article_title,source,used_at");
  const payload = rows.map((row) => ({ ...row, project_key: PROJECT_KEY }));
  report.keyword_usage_events = await insertRows("keyword_usage_events", payload);
}

async function copyKeywordRefreshRuns() {
  const rows = await readAll(source, "keyword_refresh_runs", "provider,seed_keyword,status,fetched_count,consumed_credit,error,created_at");
  const payload = rows.map((row) => ({ ...row, project_key: PROJECT_KEY }));
  report.keyword_refresh_runs = await insertRows("keyword_refresh_runs", payload);
}

async function copyCoconalaServiceUsage() {
  const rows = await readAll(source, "coconala_service_usage", "service_url,service_id,offer_id,product,title,usage_count,last_used_at,first_used_at,created_at,updated_at");
  const payload = rows.map((row) => ({ ...row, project_key: PROJECT_KEY }));
  report.coconala_service_usage = await upsertRows("coconala_service_usage", payload, "project_key,service_url");
}

async function copyCoconalaServiceUsageLog() {
  const rows = await readAll(source, "coconala_service_usage_log", "service_url,service_id,article_slug,article_title,offer_id,product,used_at");
  const payload = rows.map((row) => ({ ...row, project_key: PROJECT_KEY }));
  report.coconala_service_usage_log = await insertRows("coconala_service_usage_log", payload);
}

async function copyArticlePageViewCounts() {
  const rows = await readAll(source, "article_page_view_counts", "article_slug,view_count,first_viewed_at,last_viewed_at");
  const payload = rows.map((row) => ({ ...row, project_key: PROJECT_KEY }));
  report.article_page_view_counts = await upsertRows("article_page_view_counts", payload, "project_key,article_slug");
}

async function copyArticlePageViewEvents() {
  const rows = await readAll(source, "article_page_view_events", "article_slug,viewed_at,referrer,user_agent");
  const payload = rows.map((row) => ({ ...row, project_key: PROJECT_KEY }));
  report.article_page_view_events = await insertRows("article_page_view_events", payload);
}

async function readAll(client, table, columns) {
  const { data, error } = await client.from(table).select(columns).limit(10000);
  if (error) {
    report[table] = { readError: error.message };
    return [];
  }
  return data || [];
}

async function upsertRows(table, rows, onConflict) {
  if (!rows.length) return { readCount: 0, writtenCount: 0 };
  const { error } = await target.from(table).upsert(rows, { onConflict });
  return { readCount: rows.length, writtenCount: error ? 0 : rows.length, error: error?.message || null };
}

async function insertRows(table, rows) {
  if (!rows.length) return { readCount: 0, writtenCount: 0 };
  const { error } = await target.from(table).insert(rows);
  return { readCount: rows.length, writtenCount: error ? 0 : rows.length, error: error?.message || null };
}

function createSupabaseClient(env, label) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error(`${label} Supabase URL or service role key is missing.`);
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function readEnvFile(path) {
  const raw = await fs.readFile(path, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key) env[key] = value;
  }
  return env;
}
