import fs from "fs/promises";

const SOURCE_ENV_FILE = process.env.SOURCE_ENV_FILE || "C:\\Users\\taiki\\dev\\switchbot-life-guide\\.env.local";
const TARGET_ENV_FILES = (process.env.TARGET_ENV_FILES || ".env.local,.env.production.local")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const copiedKeys = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_HOST",
  "POSTGRES_DATABASE",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
];

const source = await readEnvFile(SOURCE_ENV_FILE);
const report = {};

for (const targetPath of TARGET_ENV_FILES) {
  const target = await readEnvFile(targetPath).catch(() => ({}));
  for (const key of copiedKeys) {
    if (source[key]) target[key] = source[key];
  }
  target.SUPABASE_PROJECT_KEY = "sns-blog-outsourcing-guide";
  await writeEnvFile(targetPath, target);
  report[targetPath] = {
    copiedKeys: copiedKeys.filter((key) => Boolean(source[key])),
    projectKey: target.SUPABASE_PROJECT_KEY,
  };
}

console.log(JSON.stringify(report, null, 2));

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

async function writeEnvFile(path, env) {
  const lines = Object.keys(env)
    .sort()
    .map((key) => `${key}=${quoteIfNeeded(env[key])}`);
  await fs.writeFile(path, `${lines.join("\n")}\n`, "utf8");
}

function quoteIfNeeded(value) {
  const stringValue = String(value || "");
  if (!stringValue || /[\s#"'`]/.test(stringValue)) {
    return JSON.stringify(stringValue);
  }
  return stringValue;
}
