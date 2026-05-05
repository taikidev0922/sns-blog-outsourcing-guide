import { getPipelineConfig } from "./pipeline-mode.js";
import { nicheConfig } from "./niche-config.js";

export async function generateArticleWithClaude(keywordCandidate, existingArticles, officialContext = null, comparisonItems = []) {
  const pipeline = getPipelineConfig();

  if (!pipeline.claudeLive) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const prompt = buildPrompt(keywordCandidate, existingArticles, officialContext, comparisonItems);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: pipeline.anthropicModel,
      max_tokens: pipeline.claudeMaxTokens,
      temperature: 0.45,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      source: "claude-error",
      error: payload?.error?.message || `Claude API failed with status ${response.status}`,
    };
  }

  const text = payload?.content?.find((part) => part.type === "text")?.text;
  const completedText = text ? `{${text}` : text;
  const article = parseArticleJson(completedText);
  if (!article) {
    return {
      source: "claude-error",
      error: "Claude did not return valid article JSON.",
      rawTextSnippet: completedText?.slice(0, 500) || null,
    };
  }

  return {
    source: "claude",
    title: cleanString(article.title, `${keywordCandidate.keyword}を依頼する前に確認したいこと`, 64),
    excerpt: cleanString(
      article.excerpt,
      `${keywordCandidate.keyword}で迷う人向けに、自作と外注の判断基準、比較軸、依頼前チェックを整理します。`,
      160
    ),
    verdict: cleanString(article.verdict, "", 240),
    buyingGuide: normalizeBuyingGuide(article.buyingGuide),
    affiliateCta: normalizeAffiliateCta(article.affiliateCta),
    recommendedComparisonReason: cleanString(article.recommendedComparisonReason, "", 180),
    blocks: normalizeBlocks(article.blocks),
  };
}

function buildPrompt(keywordCandidate, existingArticles, officialContext, comparisonItems) {
  const recentTitles = existingArticles.slice(0, 8).map((article) => `- ${article.title}`).join("\n") || "- なし";
  const sourceText = buildOfficialSourceText(officialContext);
  const comparisonText = buildComparisonText(comparisonItems);
  const keywordStrategyText = buildKeywordStrategyText(keywordCandidate);

  return [
    nicheConfig.generation.editorRole,
    nicheConfig.generation.articleGoal,
    "出力は必ずJSONオブジェクトのみ。Markdown、説明文、コードフェンスは出力しないでください。",
    "",
    "対象キーワード:",
    keywordCandidate.keyword,
    "",
    `記事カテゴリ: ${keywordCandidate.category || "未分類"}`,
    `制作テーマ: ${keywordCandidate.product || "未分類"}`,
    `検索意図: ${keywordCandidate.intent || "未分類"}`,
    `ターゲット商品/依頼カテゴリ: ${keywordCandidate.offerId || keywordCandidate.product || "未分類"}`,
    `SEOバケット: ${keywordCandidate.keywordTier || keywordCandidate.metrics?.keywordTier || "unknown"}`,
    `月間検索数: ${keywordCandidate.metrics?.searchVolume ?? "unknown"}`,
    `SEO難易度: ${keywordCandidate.metrics?.seoDifficulty ?? "unknown"}`,
    "",
    "今回のSEO戦略:",
    keywordStrategyText,
    "",
    "比較候補として本文で意識する商品:",
    comparisonText,
    "",
    "参考情報:",
    sourceText,
    "",
    "直近の記事タイトル。似すぎる切り口を避け、記事ごとに悩みや比較軸を変える:",
    recentTitles,
    "",
    "記事品質ルール:",
    "- 誇大表現を避ける",
    "- 個別サービスの価格、納期、対応範囲を断定しない。数字を出す場合は「記事作成時点の候補情報」「最新情報はココナラで確認」と分かる表現にする",
    "- 読者の悩みから入り、解決策として複数候補を比較する流れにする",
    "- 比較候補のうち最初の1件だけを一番おすすめとして扱い、その理由をrecommendedComparisonReasonに書く。通常候補の商品説明文は本文に出さない",
    "- 比較軸は毎回少し変える。例: 初心者向け、安さ、実績重視、テイスト重視、納期、修正範囲、商用利用、発信媒体別",
    "- CTAは記事テーマに近いココナラの候補確認へ自然につなげる",
    "- A8の商品リンクURLや計測タグには触れず、本文内でURLを生成しない",
    "- 日本語として自然に書く",
    "",
    "JSON schema:",
    JSON.stringify({
      title: "記事タイトル。32から52文字程度",
      excerpt: "120文字以内の要約",
      verdict: "自作か外注かの判断につながる結論。100から180文字程度",
      recommendedComparisonReason: "一番おすすめ候補を選ぶ理由。価格、評価、レビュー数、用途適合などから80から140文字程度で自然に説明",
      buyingGuide: {
        bestFor: ["向いている人1", "向いている人2", "向いている人3"],
        checkPoints: ["依頼前チェック1", "依頼前チェック2", "依頼前チェック3", "依頼前チェック4"],
        cautions: ["注意点1", "注意点2", "注意点3"],
      },
      affiliateCta: {
        headline: "ココナラ確認へ自然につながる見出し",
        body: "実績、価格、納期、修正範囲などを確認すべき理由",
        buttonText: nicheConfig.affiliate.buttonText,
      },
      blocks: [
        { heading: "見出し", paragraphs: ["本文段落1", "本文段落2"] },
        { heading: "見出し", paragraphs: ["本文段落1", "本文段落2"] },
        { heading: "見出し", paragraphs: ["本文段落1", "本文段落2"] },
        { heading: "見出し", paragraphs: ["本文段落1", "本文段落2"] },
      ],
    }),
  ].join("\n");
}

function buildKeywordStrategyText(keywordCandidate) {
  const tier = keywordCandidate.keywordTier || keywordCandidate.metrics?.keywordTier;
  const commonRules = [
    "- 対象キーワードの語句をタイトル、導入、少なくとも1つの見出しに自然に入れる",
    "- 読者像を広げすぎず、そのキーワードで検索した人が直面している具体的な場面から書き始める",
    "- 一般論だけで終えず、比較候補の選び方と依頼前チェックに落とし込む",
  ];

  if (tier === "head") {
    return [
      "- 検索数が多い王道キーワード向け。初心者にも分かる全体像、相場感、失敗しない選び方を広めに扱う",
      "- ただし既存記事と似たタイトルや見出しを避け、今回の商品ジャンルの違いを明確に出す",
      ...commonRules,
    ].join("\n");
  }

  if (tier === "middle") {
    return [
      "- 中間ボリュームの実用キーワード向け。読者の判断材料を絞り、比較軸を具体的にする",
      "- 王道記事よりも、依頼内容、予算、修正範囲、納期などの意思決定に踏み込む",
      ...commonRules,
    ].join("\n");
  }

  if (tier === "long-tail-low-competition") {
    return [
      "- 低ボリューム・低難易度のロングテール向け。ニッチな悩みを薄めず、その状況専用の記事にする",
      "- 無理に一般化しない。検索語に含まれる対象、用途、条件、失敗不安を本文の中心にする",
      "- 導入は「こういう細かい条件で迷っている人」へ直接話しかける",
      ...commonRules,
    ].join("\n");
  }

  if (tier === "emerging") {
    return [
      "- 新しめ、または伸び始めのキーワード向け。最新断定は避けつつ、なぜ今その悩みが出ているかを整理する",
      "- 定番ノウハウよりも、最近の使われ方、依頼前に確認すべき条件、失敗しやすいズレを扱う",
      ...commonRules,
    ].join("\n");
  }

  return commonRules.join("\n");
}

function buildComparisonText(comparisonItems) {
  if (!comparisonItems?.length) return "- 候補なし。カテゴリ単位の比較として書く";

  return comparisonItems
    .slice(0, 5)
    .map((item, index) => {
      const bits = [
        `${index + 1}. ${item.title}`,
        item.sellerName ? `出品者: ${item.sellerName}` : null,
        item.price ? `価格目安: ${item.price.toLocaleString("ja-JP")}円` : null,
        item.ratingValue ? `評価: ${item.ratingValue}` : null,
        item.reviewCount ? `レビュー数: ${item.reviewCount}` : null,
      ].filter(Boolean);
      return bits.join(" / ");
    })
    .join("\n");
}

function buildOfficialSourceText(officialContext) {
  const sources = officialContext?.sources || [];
  if (!sources.length) {
    return nicheConfig.generation.noSourceMessage;
  }

  return sources
    .slice(0, 3)
    .map((source) => {
      const facts = (source.facts || []).slice(0, 3).join(" ");
      return `- ${source.title}\n  URL: ${source.url}\n  確認できた内容: ${facts || source.excerpt || "詳細不明"}`;
    })
    .join("\n");
}

function parseArticleJson(text) {
  if (!text) return null;
  const stripped = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const candidates = [stripped];
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) candidates.push(match[0]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function normalizeBuyingGuide(guide) {
  return {
    bestFor: normalizeList(guide?.bestFor, 3, 90),
    checkPoints: normalizeList(guide?.checkPoints, 5, 120),
    cautions: normalizeList(guide?.cautions, 3, 120),
  };
}

function normalizeAffiliateCta(cta) {
  return {
    headline: cleanString(cta?.headline, `${nicheConfig.affiliate.storeName}で依頼先を比較する`, 90),
    body: cleanString(
      cta?.body,
      `価格、納期、修正範囲、過去実績は出品者ごとに異なります。依頼前に${nicheConfig.affiliate.storeName}で最新情報を確認しておくと安心です。`,
      190
    ),
    buttonText: cleanString(cta?.buttonText, nicheConfig.affiliate.buttonText, 40),
  };
}

function normalizeList(value, limit, maxLength) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(Boolean)
    .slice(0, limit)
    .map((item) => cleanString(item, "", maxLength))
    .filter(Boolean);
}

function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((block) => block?.heading && Array.isArray(block.paragraphs))
    .slice(0, 4)
    .map((block) => ({
      heading: cleanString(block.heading, "確認ポイント", 80),
      paragraphs: normalizeList(block.paragraphs, 3, 760),
    }))
    .filter((block) => block.paragraphs.length);
}

function cleanString(value, fallback, maxLength = 220) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}
