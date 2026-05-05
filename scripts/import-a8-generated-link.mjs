import fs from "fs/promises";
import { parseA8TextLink } from "../lib/a8-link-parser.js";

const [serviceCandidateId, htmlPathOrRaw] = process.argv.slice(2);

if (!serviceCandidateId || !htmlPathOrRaw) {
  console.error("Usage: node scripts/import-a8-generated-link.mjs <serviceCandidateId> <html-or-html-file>");
  process.exit(1);
}

const html = htmlPathOrRaw.endsWith(".html") || htmlPathOrRaw.endsWith(".txt")
  ? await fs.readFile(htmlPathOrRaw, "utf8")
  : htmlPathOrRaw;

const parsed = parseA8TextLink(html);
if (!parsed.affiliateHref) {
  console.error("The supplied HTML does not include an A8 href.");
  process.exit(1);
}

await updateCandidates(serviceCandidateId, html, parsed);
await updateQueue(serviceCandidateId, html, parsed);

console.log(JSON.stringify({
  ok: true,
  serviceCandidateId,
  affiliateHref: parsed.affiliateHref,
  impressionUrl: parsed.impressionUrl,
  linkText: parsed.linkText,
}, null, 2));

async function updateCandidates(id, rawHtml, parsed) {
  const path = "data/coconala-service-candidates.json";
  const data = JSON.parse(await fs.readFile(path, "utf8"));
  const item = data.find((candidate) => candidate.id === id);
  if (!item) return;

  item.affiliateStatus = "linked";
  item.affiliateHtml = rawHtml;
  item.affiliateHref = parsed.affiliateHref;
  item.affiliateImpressionUrl = parsed.impressionUrl;
  item.affiliateLinkText = parsed.linkText;

  await fs.writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function updateQueue(id, rawHtml, parsed) {
  const path = "data/a8-coconala-product-link-queue.json";
  const data = JSON.parse(await fs.readFile(path, "utf8"));
  const item = data.find((queueItem) => queueItem.serviceCandidateId === id);
  if (!item) return;

  item.status = "generated";
  item.generatedHtml = rawHtml;
  item.affiliateHref = parsed.affiliateHref;
  item.affiliateImpressionUrl = parsed.impressionUrl;
  item.affiliateLinkText = parsed.linkText;
  item.generatedAt = new Date().toISOString();

  await fs.writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
