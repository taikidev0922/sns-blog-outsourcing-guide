import fs from "fs/promises";
import pg from "pg";

await loadEnvFile(process.env.SUPABASE_ENV_FILE || ".env.local");

const connectionString = stripSslMode(
  process.env.SUPABASE_DB_DIRECT_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL
);

if (!connectionString) {
  throw new Error("SUPABASE_DB_DIRECT_URL, SUPABASE_DB_URL, POSTGRES_URL_NON_POOLING, or POSTGRES_URL is required.");
}

function stripSslMode(value) {
  if (!value) return value;
  const url = new URL(value);
  url.searchParams.delete("sslmode");
  return url.toString();
}

const migrationDir = "supabase/migrations";
const migrationFiles = (await fs.readdir(migrationDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();
try {
  for (const file of migrationFiles) {
    const sql = await fs.readFile(`${migrationDir}/${file}`, "utf8");
    await client.query(sql);
    console.log(`Applied ${file}`);
  }
} finally {
  await client.end();
}

async function loadEnvFile(path) {
  const raw = await fs.readFile(path, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
