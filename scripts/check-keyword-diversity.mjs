import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseProjectKey } from "../lib/supabase-admin.js";

await loadEnvFile(".env.local");
await loadEnvFile(".env.production.local");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
const projectKey = getSupabaseProjectKey();

const { data, error } = await supabase
  .from("keyword_candidates")
  .select("keyword, product, intent, metrics, usage_count, last_used_at, source")
  .eq("project_key", projectKey)
  .order("usage_count", { ascending: true })
  .order("discovered_at", { ascending: false })
  .limit(500);

if (error) throw error;

const byProduct = groupBy(data || [], (row) => row.product || "unknown");
const byTier = groupBy(data || [], (row) => row.metrics?.keywordTier || "unknown");

console.log(JSON.stringify({
  projectKey,
  total: data?.length || 0,
  byProduct: summarizeGroups(byProduct),
  byTier: summarizeGroups(byTier),
  unusedSamplesByProduct: Object.fromEntries(
    Object.entries(byProduct).map(([product, rows]) => [
      product,
      rows
        .filter((row) => !row.usage_count)
        .slice(0, 8)
        .map((row) => ({
          keyword: row.keyword,
          tier: row.metrics?.keywordTier || "unknown",
          volume: row.metrics?.searchVolume ?? null,
          difficulty: row.metrics?.seoDifficulty ?? null,
        })),
    ]),
  ),
}, null, 2));

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function summarizeGroups(groups) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, rows]) => [
      key,
      {
        total: rows.length,
        unused: rows.filter((row) => !row.usage_count).length,
        used: rows.filter((row) => row.usage_count > 0).length,
      },
    ]),
  );
}

async function loadEnvFile(path) {
  const raw = await fs.readFile(path, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}
