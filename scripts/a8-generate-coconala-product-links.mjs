import fs from "fs/promises";
import { parseA8TextLink } from "../lib/a8-link-parser.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase-admin.js";

const A8_GOODS_LINK_URL =
  process.env.A8_GOODS_LINK_URL ||
  "https://pub.a8.net/a8v2/media/goodsLinkAction.do?insId=s00000012624009";
const QUEUE_PATH = process.env.A8_COCONALA_QUEUE_PATH || "data/a8-coconala-product-link-queue.json";
const LIMIT = Number(process.env.A8_GENERATE_LIMIT || 5);

if (!process.env.A8_LOGIN_ID || !process.env.A8_PASSWORD) {
  console.error("A8_LOGIN_ID and A8_PASSWORD are required.");
  process.exit(1);
}

const { chromium } = await importPlaywright();
const queue = JSON.parse(await fs.readFile(QUEUE_PATH, "utf8"));
const targets = queue.filter((item) => item.status !== "generated").slice(0, LIMIT);

if (!targets.length) {
  console.log(JSON.stringify({ ok: true, generated: 0, reason: "queue-empty" }, null, 2));
  process.exit(0);
}

const browser = await chromium.launch({ headless: process.env.A8_HEADLESS !== "false" });
const page = await browser.newPage();

try {
  await login(page);

  const generated = [];
  for (const item of targets) {
    const result = await generateTextLink(page, item);
    Object.assign(item, {
      status: "generated",
      generatedHtml: result.html,
      affiliateHref: result.parsed.affiliateHref,
      affiliateImpressionUrl: result.parsed.impressionUrl,
      affiliateLinkText: result.parsed.linkText,
      generatedAt: new Date().toISOString(),
    });
    generated.push({ id: item.id, serviceCandidateId: item.serviceCandidateId, href: result.parsed.affiliateHref });
    await upsertGeneratedLink(item);
  }

  await fs.writeFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, generated: generated.length, items: generated }, null, 2));
} finally {
  await browser.close();
}

async function login(page) {
  await page.goto("https://www.a8.net/", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: /ログインID|ID|メディアID/i }).first().fill(process.env.A8_LOGIN_ID);
  await page.getByRole("textbox", { name: /PASS|パスワード/i }).first().fill(process.env.A8_PASSWORD);
  await page.getByRole("button", { name: /ログイン/i }).first().click();
  await page.waitForURL(/pub\.a8\.net\/a8v2\/media\//, { timeout: 30000 });
}

async function generateTextLink(page, item) {
  await page.goto(A8_GOODS_LINK_URL, { waitUntil: "domcontentloaded" });

  await page.locator('input[name="textItemUrl"]').nth(1).fill(item.destinationUrl);
  await page.locator('input[name="textInputText"]').nth(1).fill(item.linkText);
  await page.getByRole("button", { name: /商品リンク作成/ }).nth(1).click();

  const output = page.locator("textarea#text0");
  await output.waitFor({ state: "attached", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("textarea#text0")?.value?.includes("px.a8.net"), null, {
    timeout: 30000,
  });

  const html = await output.inputValue();
  const parsed = parseA8TextLink(html);
  if (!parsed.affiliateHref) {
    throw new Error(`A8 did not generate a href for ${item.id}`);
  }

  return { html, parsed };
}

async function upsertGeneratedLink(item) {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseAdmin();
  await supabase
    .from("coconala_service_inventory")
    .update({
      affiliate_status: "linked",
      affiliate_html: item.generatedHtml,
      affiliate_href: item.affiliateHref,
      affiliate_impression_url: item.affiliateImpressionUrl,
      affiliate_link_text: item.affiliateLinkText,
    })
    .eq("id", item.serviceCandidateId);
}

async function importPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error("The playwright package is required. Install it with: npm install playwright");
    process.exit(1);
  }
}
