import fs from "fs/promises";
import { applyGeneratedArticleContent, buildDummyArticle } from "../lib/article-generator.js";
import { appendArticle, readArticles, writeArticles } from "../lib/articles-store.js";
import { generateArticleWithClaude } from "../lib/claude-articles.js";
import { selectKeywordForArticle } from "../lib/keyword-store.js";
import { generateImageWithOpenAI } from "../lib/openai-images.js";

await loadEnvFile(".env.local");

process.env.ARTICLE_PIPELINE_MODE = "test";
process.env.TEST_CLAUDE_ARTICLE_LIVE = process.env.TEST_CLAUDE_ARTICLE_LIVE || "false";
process.env.TEST_OPENAI_IMAGE_LIVE = process.env.TEST_OPENAI_IMAGE_LIVE || "false";
process.env.TEST_OPENAI_IMAGE_MODEL = process.env.TEST_OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
process.env.TEST_OPENAI_IMAGE_QUALITY = process.env.TEST_OPENAI_IMAGE_QUALITY || "low";
process.env.TEST_OPENAI_IMAGE_SIZE = process.env.TEST_OPENAI_IMAGE_SIZE || "1024x1024";
process.env.TEST_CLAUDE_MAX_TOKENS = process.env.TEST_CLAUDE_MAX_TOKENS || "900";

const before = await readArticles();
const keywordCandidate = await selectKeywordForArticle(before);
const baseArticle = buildDummyArticle(before, keywordCandidate);
const generatedContent = await generateArticleWithClaude(keywordCandidate, before);
let article = applyGeneratedArticleContent(baseArticle, generatedContent);
const generatedImage = await generateImageWithOpenAI(article);

if (generatedImage?.imageUrl) {
  article = {
    ...article,
    imageUrl: generatedImage.imageUrl,
    imageSource: generatedImage.source,
    imageModel: generatedImage.model,
  };
}

await appendArticle(article);

const after = await readArticles();
console.log(JSON.stringify({
  keyword: article.keyword,
  title: article.title,
  articleSource: generatedContent?.source || "fallback",
  articleError: generatedContent?.error || null,
  imageSource: generatedImage?.source || "fallback",
  imageError: generatedImage?.error || null,
  imageUrl: article.imageUrl,
  countBefore: before.length,
  countAfter: after.length,
}, null, 2));

await writeArticles(before);

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
