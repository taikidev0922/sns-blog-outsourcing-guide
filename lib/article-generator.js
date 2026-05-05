import { scoreArticleQuality } from "./article-quality.js";
import { nicheConfig } from "./niche-config.js";

export const keywordPlan = nicheConfig.keywordPlans;

export const labels = {
  product: nicheConfig.productLabels,
  category: nicheConfig.categoryLabels,
};

const imageByProduct = {
  "sns-icon": "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1400&q=82",
  "blog-logo": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1400&q=82",
  "youtube-thumbnail": "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1400&q=82",
  "kindle-cover": "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1400&q=82",
  "note-header": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=82",
  "profile-copy": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=82",
  "article-edit": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=82",
  "blog-parts": "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=82",
  "canva-support": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=82",
};

export function buildDummyArticle(existingArticles, keywordCandidate = null, officialContext = null, comparisonItems = []) {
  const fallbackPlan = keywordPlan[existingArticles.length % keywordPlan.length];
  const keywordPlanItem = keywordCandidate?.keyword ? buildPlanFromKeyword(keywordCandidate.keyword, fallbackPlan) : fallbackPlan;
  const serial = existingArticles.length + 1;
  const now = new Date();
  const offer = findTargetOffer(keywordPlanItem.offerId || keywordPlanItem.product);
  const productName = labels.product[keywordPlanItem.product] || offer?.label || nicheConfig.generation.fallbackProductName;
  const categoryName = labels.category[keywordPlanItem.category] || nicheConfig.generation.defaultCategory;
  const buyingGuide = buildBuyingGuide(keywordPlanItem, productName, offer);

  const article = {
    id: `article-${now.getTime()}`,
    slug: `${keywordPlanItem.slugBase}-${serial}`,
    title: buildTitle(keywordPlanItem, productName, serial),
    excerpt: buildExcerpt(keywordPlanItem, productName),
    keyword: keywordPlanItem.keyword,
    category: keywordPlanItem.category,
    product: keywordPlanItem.product,
    intent: keywordPlanItem.intent,
    offerId: offer?.id || keywordPlanItem.offerId || keywordPlanItem.product,
    targetOffer: offer ? {
      id: offer.id,
      label: offer.label,
      allowedCategory: offer.allowedCategory,
      categoryUrl: offer.categoryUrl,
    } : null,
    comparisonItems,
    recommendedComparisonItemId: comparisonItems[0]?.id || null,
    recommendedComparisonReason: buildRecommendedReason(comparisonItems[0], productName),
    keywordSource: keywordCandidate?.source || "fallback",
    keywordTier: keywordCandidate?.keywordTier || keywordCandidate?.metrics?.keywordTier || null,
    keywordMetrics: keywordCandidate?.metrics
      ? {
        ...keywordCandidate.metrics,
        keywordTier: keywordCandidate.keywordTier || keywordCandidate.metrics.keywordTier || null,
      }
      : null,
    officialSourceSite: officialContext?.sourceSite || null,
    officialSourceFetchedAt: officialContext?.fetchedAt || null,
    officialSources: officialContext?.sources || [],
    imagePrompt: `${nicheConfig.generation.imagePrompt} Article keyword: ${keywordPlanItem.keyword}. Target offer: ${offer?.label || productName}.`,
    imageUrl: imageByProduct[keywordPlanItem.product] || imageByProduct["blog-parts"],
    publishedAt: now.toISOString(),
    readingMinutes: 6,
    verdict: buildVerdict(keywordPlanItem, productName, offer),
    buyingGuide,
    affiliateCta: buildAffiliateCta(keywordPlanItem, productName, offer, comparisonItems),
    blocks: buildArticleBlocks(keywordPlanItem, productName, categoryName, buyingGuide, offer, comparisonItems),
  };

  return attachQuality(article);
}

export function applyGeneratedArticleContent(article, generatedContent) {
  if (!generatedContent || generatedContent.source !== "claude") {
    return attachQuality(article);
  }

  return attachQuality({
    ...article,
    title: generatedContent.title || article.title,
    excerpt: generatedContent.excerpt || article.excerpt,
    verdict: generatedContent.verdict || article.verdict,
    buyingGuide: generatedContent.buyingGuide || article.buyingGuide,
    affiliateCta: generatedContent.affiliateCta
      ? { ...article.affiliateCta, ...generatedContent.affiliateCta, url: article.affiliateCta?.url || generatedContent.affiliateCta.url }
      : article.affiliateCta,
    recommendedComparisonReason: generatedContent.recommendedComparisonReason || article.recommendedComparisonReason,
    blocks: generatedContent.blocks?.length ? generatedContent.blocks : article.blocks,
    articleSource: "claude",
  });
}

export function findTargetOffer(idOrProduct) {
  return nicheConfig.targetOffers.find((offer) => offer.id === idOrProduct || offer.product === idOrProduct) || null;
}

function buildTitle(item, productName, serial) {
  if (item.category === "compare") return `${productName}の依頼先を比較するポイントと候補の見方 ${serial}`;
  if (item.category === "selfmade") return `${productName}は自作で足りる？外注した方がいい場面 ${serial}`;
  if (item.category === "template") return `${productName}の依頼文テンプレと失敗しない伝え方 ${serial}`;
  if (item.category === "trouble") return `${productName}依頼で後悔しないための確認ポイント ${serial}`;
  return `${productName}をココナラで依頼する前に決めること ${serial}`;
}

function buildExcerpt(item, productName) {
  if (item.category === "compare") {
    return `${productName}の外注候補を選ぶときに、価格だけでなく実績、テイスト、修正範囲、納品形式をどう比較するか整理します。`;
  }
  if (item.category === "selfmade") {
    return `${productName}を自作するか外注するか迷う人向けに、自作で十分な範囲と依頼した方がよい場面を整理します。`;
  }
  if (item.category === "template") {
    return `${productName}をスムーズに依頼するため、目的、使用場所、希望テイスト、納品形式、修正条件を依頼文に落とし込む方法を解説します。`;
  }
  return `${productName}をココナラで依頼する前に、自分で準備すること、出品者に確認すること、依頼後のズレを減らすコツを整理します。`;
}

function buildVerdict(item, productName, offer) {
  const destination = offer?.allowedCategory ? `ココナラの「${offer.allowedCategory}」カテゴリ` : "ココナラ";
  if (item.intent === "selfmade-limit") {
    return `${productName}は趣味や下書きなら自作でも十分です。ただし発信の第一印象やクリック率に関わるなら、早めに${destination}で複数候補を比較した方が手戻りを減らせます。`;
  }
  if (item.intent === "budget") {
    return `相場だけで判断せず、納品形式、修正回数、実績の近さまで見るのが安全です。${productName}は安さよりも、用途に合うテイストを優先しましょう。`;
  }
  if (item.intent === "creator-selection") {
    return `${productName}の外注は、評価数だけでなく過去制作物が自分の発信ジャンルに近いかを見ると失敗しにくくなります。`;
  }
  return `${productName}は、依頼前に目的、掲載場所、希望テイスト、納期を決めておくほど仕上がりが安定します。候補探しは${destination}から始めるのが自然です。`;
}

function buildRecommendedReason(item, productName) {
  if (!item) return "";
  const reasons = [];
  if (item.affiliateMaterial?.href) reasons.push("詳細確認リンクを用意できている");
  if (item.reviewCount) reasons.push("レビュー数が多く比較の起点にしやすい");
  if (item.ratingValue) reasons.push("評価も確認しやすい");
  const suffix = reasons.length ? reasons.slice(0, 2).join("うえ、") : "比較の最初に見やすい条件がそろっている";
  return `${productName}の候補を見始めるなら、まずこのサービスを基準にすると他候補との差を比べやすいです。${suffix}ため、最初の確認先として置いています。`;
}

function buildBuyingGuide(item, productName, offer) {
  return {
    bestFor: [
      `${productName}を発信活動や販売導線に使う予定がある人`,
      "自作してみたものの、素人っぽさや統一感のなさが気になっている人",
      "制作会社に頼むほどではないが、第三者の手で見た目や文章を整えたい人",
    ],
    checkPoints: [
      "使用場所を決める。Instagram、X、ブログ、YouTube、Kindleなどで必要なサイズや見え方が変わります。",
      "希望テイストを言語化する。かわいい、信頼感、専門的、シンプルなど、避けたい表現も一緒に伝えます。",
      "納品形式を確認する。画像ならPNG/JPG、ロゴなら透過データ、文章なら文字数や構成まで確認します。",
      "修正範囲と回数を見る。初稿後にどこまで直せるかで、依頼後の安心感が変わります。",
      offer?.allowedCategory
        ? `依頼先は、記事テーマに近い「${offer.allowedCategory}」の候補から確認します。`
        : "依頼先は、記事テーマに近いカテゴリの候補から確認します。",
    ],
    cautions: [
      "リンク先の最新情報を確認してから、相談内容を決めてください。",
      "個別サービスは出品停止や価格変更が起きるため、記事本文では価格や提供内容を断定しすぎない方が安全です。",
      "安さだけで選ぶと、修正対応や商用利用範囲で想定外の手間が出ることがあります。",
    ],
  };
}

function buildAffiliateCta(item, productName, offer, comparisonItems) {
  const fallbackUrl = process.env[nicheConfig.affiliate.fallbackUrlEnv] || nicheConfig.affiliate.fallbackUrl;
  const firstMaterial = comparisonItems.find((service) => service.affiliateMaterial?.href)?.affiliateMaterial;

  return {
    headline: `${productName}の依頼候補をココナラで比較する`,
    body: `${item.keyword}で迷っているなら、まずは近い実績のある出品者を複数見比べましょう。価格、納期、修正回数、過去制作物を確認してから相談すると、依頼後のズレを減らせます。`,
    buttonText: offer?.ctaText || nicheConfig.affiliate.buttonText,
    url: firstMaterial?.href || fallbackUrl,
    destinationUrl: firstMaterial?.destinationUrl || offer?.categoryUrl || null,
  };
}

function buildArticleBlocks(item, productName, categoryName, buyingGuide, offer, comparisonItems) {
  const comparisonIntro = comparisonItems.length
    ? `この記事では、${productName}に近いココナラ上の候補を複数並べ、価格帯、評価、レビュー数から比較しやすいポイントを見ます。`
    : `この記事では、${productName}を依頼する前に整理したい判断軸を中心に見ます。`;

  return [
    {
      heading: `${categoryName}: まず決めるべきこと`,
      paragraphs: [
        `${productName}を依頼する前に最初に決めたいのは、何を作るかではなく、どこで何のために使うかです。SNSの第一印象を整えたいのか、ブログの信頼感を上げたいのか、クリック率を上げたいのかで、必要な成果物は変わります。`,
        comparisonIntro,
      ],
    },
    {
      heading: "自作で十分な範囲と、外注した方がよい範囲",
      paragraphs: [
        `仮のプロフィール画像や個人メモ用のアイキャッチなら、自作でも十分な場面があります。一方で、収益化ブログ、YouTube、Kindle、仕事用アカウントなど、見た目が信用やクリックに影響する場所では外注の効果が出やすくなります。`,
        `特に${productName}は、細かな品質差が第一印象に出ます。自作に時間を使い続けるより、方向性が合う人に任せる方が発信そのものに集中できます。`,
      ],
    },
    {
      heading: "依頼前チェックリスト",
      paragraphs: [
        buyingGuide.checkPoints.map((point) => `・${point}`).join("\n"),
        "このチェックを済ませてから相談すると、出品者も見積もりや提案を出しやすくなります。特に、ここが曖昧なまま依頼すると、完成後に「なんとなく違う」というズレが起きやすくなります。",
      ],
    },
    {
      heading: "候補を比較するときの見方",
      paragraphs: [
        "見るべき順番は、価格、評価、実績画像、説明文、修正条件です。安いサービスを探すより、自分の目的に近い実績があるか、相談しやすい説明になっているかを優先すると選びやすくなります。",
        offer?.allowedCategory
          ? `候補を探すときは、まず「${offer.allowedCategory}」に近いサービスから見ると、記事テーマとずれにくくなります。カテゴリ一覧だけでなく、出品者プロフィールやサービスページの実績も確認しましょう。`
          : "候補を探すときは、記事テーマに近いカテゴリから見始めると、目的とずれにくくなります。出品者プロフィールやサービスページの実績も確認しましょう。",
      ],
    },
    {
      heading: "次に読むべき記事",
      paragraphs: [
        `${productName}だけで判断しきれない場合は、同じテーマの依頼文テンプレ、比較記事、自作の限界を扱う記事を続けて読むと、依頼前の不安を減らせます。`,
      ],
    },
  ];
}

export function buildPlanFromKeyword(keyword, fallbackPlan) {
  const offer = inferOffer(keyword) || findTargetOffer(fallbackPlan.offerId || fallbackPlan.product);
  const category = inferCategory(keyword, fallbackPlan.category);
  const product = offer?.product || inferProduct(keyword, fallbackPlan.product);
  const intent = inferIntent(keyword, fallbackPlan.intent);

  return {
    keyword,
    category,
    product,
    intent,
    offerId: offer?.id || fallbackPlan.offerId || product,
    slugBase: toAsciiSlug(keyword, fallbackPlan.slugBase, offer?.id || product),
  };
}

function inferOffer(keyword) {
  const normalized = keyword.toLowerCase();
  return nicheConfig.targetOffers.find((offer) =>
    offer.seedKeywords.some((seed) => normalized.includes(seed.toLowerCase().split(" ")[0])) ||
    normalized.includes(offer.product.replace("-", " "))
  ) || null;
}

function inferCategory(keyword, fallback) {
  if (hasAny(keyword, ["比較", "選び方", "おすすめ", "どっち"])) return "compare";
  if (hasAny(keyword, ["作り方", "自作", "Canva", "限界"])) return "selfmade";
  if (hasAny(keyword, ["テンプレ", "依頼文", "伝え方"])) return "template";
  if (hasAny(keyword, ["失敗", "トラブル", "後悔"])) return "trouble";
  if (hasAny(keyword, ["依頼", "外注", "添削", "リライト"])) return "request";
  return fallback;
}

function inferProduct(keyword, fallback) {
  if (hasAny(keyword, ["アイコン", "X"])) return "sns-icon";
  if (keyword.includes("ロゴ")) return "blog-logo";
  if (hasAny(keyword, ["サムネ", "YouTube"])) return "youtube-thumbnail";
  if (hasAny(keyword, ["Kindle", "表紙", "電子書籍"])) return "kindle-cover";
  if (keyword.includes("note")) return "note-header";
  if (hasAny(keyword, ["プロフィール", "自己紹介"])) return "profile-copy";
  if (hasAny(keyword, ["記事", "リライト", "添削"])) return "article-edit";
  if (hasAny(keyword, ["Canva", "バナー", "アイキャッチ"])) return "blog-parts";
  return fallback;
}

function inferIntent(keyword, fallback) {
  if (hasAny(keyword, ["相場", "料金", "費用"])) return "budget";
  if (hasAny(keyword, ["選び方", "比較", "おすすめ"])) return "creator-selection";
  if (hasAny(keyword, ["自作", "作り方", "Canva", "限界"])) return "selfmade-limit";
  if (hasAny(keyword, ["テンプレ", "依頼文", "伝え方"])) return "brief";
  if (hasAny(keyword, ["失敗", "後悔", "トラブル"])) return "risk";
  return fallback;
}

function toAsciiSlug(keyword, fallback, offerId) {
  const tokens = [offerId || nicheConfig.id];
  const normalized = keyword.toLowerCase();

  if (hasAny(normalized, ["request", "依頼", "外注"])) tokens.push("request");
  if (hasAny(normalized, ["compare", "比較", "選び方"])) tokens.push("compare");
  if (hasAny(normalized, ["selfmade", "自作", "作り方", "canva"])) tokens.push("selfmade");
  if (hasAny(normalized, ["template", "テンプレ", "依頼文"])) tokens.push("template");
  if (hasAny(normalized, ["budget", "相場", "料金", "費用"])) tokens.push("budget");

  return [...new Set(tokens)].join("-") || fallback;
}

function attachQuality(article) {
  return {
    ...article,
    quality: scoreArticleQuality(article),
  };
}

function hasAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}
