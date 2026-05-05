const TEST_MODE = "test";
const PRODUCTION_MODE = "production";

export function getPipelineMode() {
  const rawMode = process.env.ARTICLE_PIPELINE_MODE || process.env.CONTENT_PIPELINE_MODE || TEST_MODE;
  return rawMode === PRODUCTION_MODE ? PRODUCTION_MODE : TEST_MODE;
}

export function getPipelineConfig() {
  const mode = getPipelineMode();
  const isTest = mode === TEST_MODE;

  return {
    mode,
    rakkoLive: isTest ? false : process.env.RAKKO_KEYWORD_LIVE === "true",
    claudeLive: isTest ? process.env.TEST_CLAUDE_ARTICLE_LIVE === "true" : process.env.CLAUDE_ARTICLE_LIVE === "true",
    openaiImageLive: isTest ? process.env.TEST_OPENAI_IMAGE_LIVE === "true" : process.env.OPENAI_IMAGE_LIVE === "true",
    anthropicModel: isTest
      ? process.env.TEST_ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929"
      : process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
    claudeMaxTokens: Number(isTest ? process.env.TEST_CLAUDE_MAX_TOKENS || 900 : process.env.CLAUDE_MAX_TOKENS || 3200),
    openaiImageModel: isTest
      ? process.env.TEST_OPENAI_IMAGE_MODEL || "gpt-image-1-mini"
      : process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    openaiImageQuality: isTest
      ? process.env.TEST_OPENAI_IMAGE_QUALITY || "low"
      : process.env.OPENAI_IMAGE_QUALITY || "low",
    openaiImageSize: isTest
      ? process.env.TEST_OPENAI_IMAGE_SIZE || "1024x1024"
      : process.env.OPENAI_IMAGE_SIZE || "1536x1024",
    xPostSearchLive: isTest ? false : process.env.X_POST_SEARCH_LIVE === "true",
    xMaxPostReadsPerArticle: Number(process.env.X_MAX_POST_READS_PER_ARTICLE || 10),
    xMaxEmbedsPerArticle: Number(process.env.X_MAX_EMBEDS_PER_ARTICLE || 3),
  };
}
