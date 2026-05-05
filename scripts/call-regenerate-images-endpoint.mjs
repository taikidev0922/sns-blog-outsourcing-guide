import fs from "fs/promises";

await loadEnvFile(".env.local");
await loadEnvFile(".env.vercel.local");
await loadEnvFile(".env.production.local");

const token = process.env.MAINTENANCE_SECRET || process.env.CRON_SECRET || process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error("MAINTENANCE_SECRET, CRON_SECRET, or BLOB_READ_WRITE_TOKEN is required.");

const baseUrl = process.env.PRODUCTION_SITE_URL || "https://sns-blog-outsourcing-guide.vercel.app";
const limit = process.argv[2] ? `?limit=${Number(process.argv[2])}` : "";
const response = await fetch(`${baseUrl}/api/maintenance/regenerate-images${limit}`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
  },
});

const payload = await response.json().catch(() => null);
console.log(JSON.stringify({
  status: response.status,
  ok: response.ok && payload?.ok !== false,
  payload,
}, null, 2));

if (!response.ok || payload?.ok === false) {
  process.exitCode = 1;
}

async function loadEnvFile(path) {
  const raw = await fs.readFile(path, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
