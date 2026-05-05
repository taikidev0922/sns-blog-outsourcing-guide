import { parseA8TextLink } from "./a8-link-parser.js";

const DEFAULT_A8_GOODS_LINK_URL = "https://pub.a8.net/a8v2/media/goodsLinkAction.do?insId=s00000012624009";

export async function generateA8TextLinksForServices(services) {
  if (!services?.length) return [];
  if (!process.env.A8_LOGIN_ID || !process.env.A8_PASSWORD) return [];

  const attempts = Math.max(1, Number(process.env.A8_BROWSER_RETRY_COUNT || 2));
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await generateA8TextLinksForServicesOnce(services);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
      }
    }
  }

  throw lastError;
}

async function generateA8TextLinksForServicesOnce(services) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.setDefaultTimeout(Number(process.env.A8_BROWSER_TIMEOUT_MS || 30000));

  try {
    await login(page);

    const generated = [];
    for (const service of services.slice(0, 3)) {
      try {
        const affiliateHtml = await generateTextLink(page, {
          destinationUrl: service.serviceUrl,
          linkText: buildA8LinkText(service),
        });
        const parsed = parseA8TextLink(affiliateHtml);
        generated.push({
          serviceUrl: service.serviceUrl,
          affiliateHtml,
          affiliateHref: parsed.affiliateHref,
          affiliateImpressionUrl: parsed.impressionUrl,
          affiliateLinkText: parsed.linkText,
        });
      } catch (error) {
        generated.push({
          serviceUrl: service.serviceUrl,
          error: error.message,
        });
      }
    }

    return generated;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function launchBrowser() {
  const { chromium: playwrightChromium } = await import("playwright");

  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return playwrightChromium.launch({
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  return playwrightChromium.launch({
    headless: process.env.A8_HEADLESS !== "false",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function login(page) {
  await page.goto("https://www.a8.net/", { waitUntil: "domcontentloaded" });
  const loginForm = page.locator("#headArea");
  await loginForm.locator('input[name="login"]').fill(process.env.A8_LOGIN_ID);
  await loginForm.locator('input[name="passwd"]').fill(process.env.A8_PASSWORD);
  await loginForm.locator('input[type="submit"], button[type="submit"]').first().click();
  await page.waitForURL(/pub\.a8\.net\/a8v2\/media\//, { timeout: 30000 });
}

async function generateTextLink(page, { destinationUrl, linkText }) {
  const goodsLinkUrl = process.env.A8_GOODS_LINK_URL || DEFAULT_A8_GOODS_LINK_URL;
  await page.goto(goodsLinkUrl, { waitUntil: "domcontentloaded" });

  await page.locator('input[name="textItemUrl"]').nth(1).fill(destinationUrl);
  await page.locator('input[name="textInputText"]').nth(1).fill(linkText);
  await page.locator('input[type="submit"][value="商品リンク作成"], button:has-text("商品リンク作成")').nth(1).click();

  const output = page.locator("textarea#text0");
  await output.waitFor({ state: "attached", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("textarea#text0")?.value?.includes("px.a8.net"), null, {
    timeout: 30000,
  });

  const html = await output.inputValue();
  if (!parseA8TextLink(html).affiliateHref) {
    throw new Error(`A8 did not generate a product link for ${destinationUrl}`);
  }
  return html;
}

function buildA8LinkText(service) {
  const title = String(service.title || "").replace(/\s+/g, " ").trim();
  const shortTitle = title.length > 42 ? `${title.slice(0, 42)}...` : title;
  return `${shortTitle || "ココナラのサービス"}をココナラで確認する`;
}
