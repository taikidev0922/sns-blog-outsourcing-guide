import fs from "fs/promises";

const raw = await fs.readFile(".env.local", "utf8").catch(() => "");
const env = {};

for (const line of raw.split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith("#")) continue;
  const index = line.indexOf("=");
  if (index === -1) continue;
  const key = line.slice(0, index).trim();
  const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
  env[key] = value;
}

const postgresUrl = env.SUPABASE_DB_DIRECT_URL || env.SUPABASE_DB_URL || "";
let postgres = null;

try {
  const url = new URL(postgresUrl);
  postgres = {
    host: url.host,
    database: url.pathname.replace(/^\//, ""),
    user: url.username,
  };
} catch {
  postgres = null;
}

console.log(JSON.stringify({
  supabaseUrl: env.SUPABASE_URL || null,
  postgres,
  hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  hasDatabaseUrl: Boolean(postgresUrl),
}, null, 2));
