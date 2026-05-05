import fs from "fs/promises";
import pg from "pg";

await loadEnvFile(".env.local");

const connectionString = stripSslMode(
  process.env.SUPABASE_DB_DIRECT_URL ||
  process.env.SUPABASE_DB_URL
);

if (!connectionString) {
  throw new Error("SUPABASE_DB_DIRECT_URL or SUPABASE_DB_URL is required.");
}

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();
try {
  const { rows } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and (
        table_name like 'coconala_service%'
        or table_name like 'coconala_inventory%'
      )
    order by table_name
  `);

  console.log(rows.map((row) => row.table_name).join("\n"));
} finally {
  await client.end();
}

function stripSslMode(value) {
  if (!value) return value;
  const url = new URL(value);
  url.searchParams.delete("sslmode");
  return url.toString();
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
