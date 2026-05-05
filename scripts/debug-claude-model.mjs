import fs from "fs/promises";

await loadEnvFile(".env.local");

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
    max_tokens: 32,
    messages: [{ role: "user", content: "Return OK." }],
  }),
});

console.log(response.status);
console.log(await response.text());

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
