import fs from "fs/promises";

import { getSupabaseAdmin, getSupabaseProjectKey } from "../lib/supabase-admin.js";

await loadEnvFile(".env.local");

const supabase = getSupabaseAdmin();
const projectKey = getSupabaseProjectKey();
const { data, error } = await supabase
  .from("article_page_view_counts")
  .select("*")
  .eq("project_key", projectKey)
  .order("view_count", { ascending: false })
  .order("last_viewed_at", { ascending: false })
  .limit(10);

console.log(JSON.stringify({ projectKey, error: error?.message || null, data }, null, 2));

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
