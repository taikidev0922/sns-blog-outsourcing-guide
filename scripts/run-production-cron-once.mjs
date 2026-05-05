import fs from "fs";

loadEnvFile(".env.local");
loadEnvFile(".env.production.local");

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://sns-blog-outsourcing-guide.vercel.app";
const response = await fetch(`${siteUrl}/api/cron/publish-dummy`, {
  headers: {
    authorization: `Bearer ${process.env.CRON_SECRET}`,
  },
  cache: "no-store",
});

const text = await response.text();
console.log(JSON.stringify({
  status: response.status,
  body: text.slice(0, 1200),
}, null, 2));

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;
  const raw = fs.readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}
