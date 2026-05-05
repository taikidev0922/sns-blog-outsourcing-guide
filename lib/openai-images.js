import { put } from "@vercel/blob";
import { getPipelineConfig } from "./pipeline-mode.js";
import { nicheConfig } from "./niche-config.js";

export async function generateImageWithOpenAI(article) {
  const pipeline = getPipelineConfig();

  if (!pipeline.openaiImageLive) {
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = pipeline.openaiImageModel;
  const prompt = buildImagePrompt(article);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: pipeline.openaiImageSize,
      quality: pipeline.openaiImageQuality,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      source: "openai-image-error",
      error: payload?.error?.message || `OpenAI image API failed with status ${response.status}`,
    };
  }

  const imageBase64 = payload?.data?.[0]?.b64_json;
  if (!imageBase64) {
    return {
      source: "openai-image-error",
      error: "OpenAI image API did not return b64_json.",
    };
  }

  const buffer = Buffer.from(imageBase64, "base64");
  const blob = await put(`images/${article.slug}-${Date.now()}.png`, buffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "image/png",
  });

  return {
    source: "openai-image",
    imageUrl: blob.url,
    model,
  };
}

function buildImagePrompt(article) {
  const productBrief = imageBriefByProduct[article.product] || imageBriefByProduct.default;
  const intentBrief = imageBriefByIntent[article.intent] || "The scene should feel like a practical decision-making guide before outsourcing.";
  const serviceNames = (article.comparisonItems || [])
    .slice(0, 3)
    .map((item) => item.title || item.sellerName)
    .filter(Boolean)
    .join(" / ");

  return [
    "Create a realistic editorial hero image for a Japanese SEO article about outsourcing creative work.",
    productBrief,
    intentBrief,
    `Article title: ${article.title}`,
    `Main keyword: ${article.keyword}`,
    serviceNames ? `Referenced service themes: ${serviceNames}` : "",
    "Use a fresh composition that clearly matches the article topic. Avoid reusing the same tidy-desk layout unless the topic specifically calls for it.",
    "No visible brand logos, no readable text, no fake UI text, no people looking at the camera. Natural Japanese small-business or solo-creator context, high detail, landscape hero composition.",
  ].join(" ");
}

const imageBriefByProduct = {
  "sns-icon":
    "Visual focus: social media profile icon creation. Show a smartphone profile screen with blank circular avatar placeholders, character illustration sketches, color palette cards, and a tablet drawing app with non-readable UI.",
  "blog-logo":
    "Visual focus: blog logo and identity design. Show logo rough drafts, typography samples without readable letters, brand color swatches, a laptop with a blank blog header mockup, and printed layout sheets.",
  "youtube-thumbnail":
    "Visual focus: YouTube thumbnail design. Show a video editing timeline, bold thumbnail composition drafts with abstract blocks instead of text, a camera or small light, and several thumbnail variations on a monitor.",
  "kindle-cover":
    "Visual focus: Kindle ebook cover design. Show paperback-sized cover mockups with abstract title blocks, book cover mood boards, typography samples without readable words, and a tablet displaying cover variations.",
  "note-header":
    "Visual focus: note or blog header image production. Show a laptop with a blank article header area, banner crops, visual mood board, and web image export previews.",
  "profile-copy":
    "Visual focus: profile writing and self-introduction copy. Show a notebook with profile structure notes represented by blurred lines, a smartphone profile layout without readable text, and editing marks on paper.",
  "article-edit":
    "Visual focus: article rewriting and editing. Show printed article drafts with correction marks, a laptop document with blurred paragraphs, sticky notes for structure, and a calm editorial workspace.",
  "blog-parts":
    "Visual focus: blog parts and web graphics. Show blog banner mockups, icon sets, article cards, color swatches, and a laptop previewing a clean website layout without readable text.",
  "canva-support":
    "Visual focus: moving beyond self-made Canva-style designs. Show before-and-after design boards, template-like layouts being refined, a laptop design canvas without readable text, and organized visual assets.",
  default:
    "Visual focus: choosing an outsourcing service for creator or blog work. Show a comparison workspace with creative drafts, checklist sheets, and multiple service-card style mockups without readable text.",
};

const imageBriefByIntent = {
  brief: "Mood: preparing a clear request brief, with checklists, requirement notes, and organized reference materials.",
  budget: "Mood: comparing price and deliverables, with calculator, estimate sheets, and service comparison cards.",
  "creator-selection": "Mood: choosing between several creators, with portfolio thumbnails, rating-like abstract cards, and side-by-side comparison.",
  "selfmade-limit": "Mood: noticing the limits of a self-made design and preparing to ask a professional for refinement.",
  request: "Mood: ready to request work, with requirements gathered and examples arranged neatly.",
};
