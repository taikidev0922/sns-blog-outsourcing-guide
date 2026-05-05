import fs from "fs/promises";
import { spawnSync } from "child_process";

const SOURCE_ENV_FILE = process.env.SOURCE_ENV_FILE || "C:\\Users\\taiki\\dev\\switchbot-life-guide\\.env.local";
const environments = (process.env.VERCEL_ENVIRONMENTS || "production,preview")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const source = await readEnvFile(SOURCE_ENV_FILE);
const values = {
  SUPABASE_URL: source.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PROJECT_KEY: "sns-blog-outsourcing-guide",
};

for (const [key, value] of Object.entries(values)) {
  if (!value) throw new Error(`${key} is missing from source env.`);
}

const report = [];

for (const [key, value] of Object.entries(values)) {
  for (const environment of environments) {
    runVercel(["env", "rm", key, environment, "--yes"], { allowFailure: true });
    runVercel(["env", "add", key, environment], { input: `${value}\n` });
    report.push({ key, environment, status: "synced" });
  }
}

console.log(JSON.stringify(report, null, 2));

function runVercel(args, options = {}) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["vercel@latest", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    input: options.input,
    shell: false,
  });

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`vercel ${args.join(" ")} failed: ${result.error?.message || result.stderr || result.stdout || `exit ${result.status}`}`);
  }
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
