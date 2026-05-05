export function scoreArticleQuality(article) {
  const checks = buildQualityChecklist(article);
  const passed = checks.filter((check) => check.passed).length;

  return {
    score: Math.round((passed / checks.length) * 100),
    checks,
  };
}

export function buildQualityChecklist(article) {
  return [
    {
      key: "search-intent",
      label: "検索意図に合うカテゴリ・制作テーマ・悩みが設定されている",
      passed: Boolean(article.category && article.product && article.intent),
    },
    {
      key: "target-offer",
      label: "誘導先となる依頼カテゴリまたはターゲット商品が設定されている",
      passed: Boolean(article.offerId || article.targetOffer),
    },
    {
      key: "comparison-items",
      label: "記事内で比較できる商品候補が複数設定されている",
      passed: Number(article.comparisonItems?.length || 0) >= 2,
    },
    {
      key: "buyer-verdict",
      label: "自作か外注かの判断につながる結論がある",
      passed: Boolean(article.verdict && article.verdict.length >= 24),
    },
    {
      key: "reader-fit",
      label: "向いている人と注意点が整理されている",
      passed: Boolean(article.buyingGuide?.bestFor?.length && article.buyingGuide?.cautions?.length),
    },
    {
      key: "decision-points",
      label: "依頼前の確認ポイントが3つ以上ある",
      passed: Number(article.buyingGuide?.checkPoints?.length || 0) >= 3,
    },
    {
      key: "body-depth",
      label: "本文ブロックが3つ以上ある",
      passed: Number(article.blocks?.length || 0) >= 3,
    },
    {
      key: "cta",
      label: "記事テーマに合うCTA文言が設定されている",
      passed: Boolean(article.affiliateCta?.headline && article.affiliateCta?.buttonText),
    },
  ];
}
