import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { ArticleBadge } from "../../../components/article-badge";
import { ArticleViewTracker } from "../../../components/article-view-tracker";
import { AffiliateMaterialLink } from "../../../components/affiliate-material-link";
import { SiteSidebar } from "../../../components/site-sidebar";
import { XPostCarousel } from "../../../components/x-post-carousel";
import { findAffiliateMaterial } from "../../../lib/affiliate-materials";
import { articleHref, resolveRelatedArticles } from "../../../lib/links";
import { readArticles } from "../../../lib/articles-store";
import { getPopularArticles } from "../../../lib/article-views";
import { fetchXPostEmbeds } from "../../../lib/x-posts";
import { absoluteUrl, siteConfig } from "../../../lib/site-config";
import { nicheConfig } from "../../../lib/niche-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const articles = await readArticles();
  const article = articles.find((entry) => entry.slug === decodedSlug || entry.slug === slug);

  if (!article) return { title: "記事が見つかりません" };

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `/articles/${article.slug}`,
    },
    openGraph: {
      type: "article",
      locale: siteConfig.locale,
      url: absoluteUrl(`/articles/${article.slug}`),
      siteName: siteConfig.name,
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt || article.publishedAt,
      images: article.imageUrl ? [{ url: article.imageUrl, width: 1400, height: 744, alt: article.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: article.imageUrl ? [article.imageUrl] : [],
    },
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const articles = await readArticles();
  const article = articles.find((entry) => entry.slug === decodedSlug || entry.slug === slug);

  if (!article) notFound();

  const relatedArticles = resolveRelatedArticles(article, articles);
  const popularArticles = await getPopularArticles(articles);
  const xEmbeds = await fetchXPostEmbeds(article.xPosts || []);
  const affiliateMaterial = findAffiliateMaterial({
    product: article.product,
    category: article.category,
    placement: "article-cta",
    type: "text",
  });

  return (
    <div className="page-shell article-page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(article)) }}
      />
      <ArticleViewTracker slug={article.slug} />
      <main className="main-content">
        <article className="article-card">
          <div className="article-meta-row">
            <ArticleBadge category={article.category} />
            <span className="category-badge badge-neutral">{article.keyword}</span>
          </div>

          <h1>{article.title}</h1>
          <p className="post-meta">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            <span>読了目安 {article.readingMinutes}分</span>
          </p>

          <figure className="hero-image">
            <Image src={article.imageUrl} alt={article.title} width={1400} height={744} priority />
          </figure>

          <section className="article-body">
            {article.verdict ? (
              <div className="verdict-box">
                <p className="eyebrow">結論</p>
                <p>{article.verdict}</p>
              </div>
            ) : null}

            <BuyingGuide article={article} />
            <OfficialSources article={article} />

            {article.blocks.slice(0, 1).map((block) => (
              <ArticleBlock block={block} key={block.heading} />
            ))}

            <ProductComparison article={article} />
            <InlineAffiliateLink article={article} material={affiliateMaterial} />

            {article.blocks.slice(1, 2).map((block) => (
              <ArticleBlock block={block} key={block.heading} />
            ))}

            <AffiliateCta article={article} label="依頼前に確認" material={affiliateMaterial} />
            <SocialReactions embeds={xEmbeds} />

            {article.blocks.slice(2).map((block) => (
              <ArticleBlock block={block} key={block.heading} />
            ))}

            <div className="internal-link-box">
              <h2>次に読む記事</h2>
              <Link href={`/?product=${article.product}#articles`}>同じ制作テーマの記事を見る</Link>
              <Link href={`/?category=${article.category}#articles`}>同じ目的の記事を見る</Link>
              <Link href={`/?intent=${article.intent}#articles`}>同じ悩みの記事を見る</Link>
            </div>

            <AffiliateCta article={article} label="読み終えた人向け" material={affiliateMaterial} />
          </section>

          <section className="related-section" aria-labelledby="related-title">
            <h2 id="related-title">関連記事</h2>
            {relatedArticles.length ? (
              <div className="related-grid">
                {relatedArticles.map((related) => (
                  <Link className="related-card" href={articleHref(related.slug)} key={related.slug}>
                    <ArticleBadge category={related.category} />
                    <strong>{related.title}</strong>
                  </Link>
                ))}
              </div>
            ) : (
              <p>関連記事は、記事が増えると自動で表示されます。</p>
            )}
          </section>
        </article>
      </main>

      <SiteSidebar popularArticles={popularArticles} />
      {xEmbeds.some((embed) => embed.html) ? <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" /> : null}
    </div>
  );
}

function buildArticleJsonLd(article) {
  const articleUrl = absoluteUrl(`/articles/${article.slug}`);

  return [
    {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    headline: article.title,
    description: article.excerpt,
    image: article.imageUrl ? [article.imageUrl] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    inLanguage: "ja-JP",
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    articleSection: article.category,
    keywords: [article.keyword, article.product, article.intent].filter(Boolean).join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: siteConfig.name,
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "記事一覧",
          item: absoluteUrl("/#articles"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: articleUrl,
        },
      ],
    },
  ];
}

function ArticleBlock({ block }) {
  return (
    <>
      <h2>{block.heading}</h2>
      {block.paragraphs.map((paragraph) => (
        <p className={paragraph.includes("\n") ? "preserve-lines" : undefined} key={paragraph}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

function BuyingGuide({ article }) {
  const guide = article.buyingGuide;
  if (!guide) return null;

  return (
    <section className="buying-guide" aria-label="依頼判断ガイド">
      <div>
        <h2>向いている人</h2>
        <ul>
          {guide.bestFor?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>依頼前の確認</h2>
        <ul>
          {guide.checkPoints?.slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>注意点</h2>
        <ul>
          {guide.cautions?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProductComparison({ article }) {
  const items = article.comparisonItems || [];
  if (items.length < 2) return null;
  const recommended = items.find((item) => item.id === article.recommendedComparisonItemId) || items[0];
  const others = items.filter((item) => item.id !== recommended.id);

  return (
    <section className="product-comparison" aria-labelledby="comparison-title">
      <p className="eyebrow">候補比較</p>
      <h2 id="comparison-title">近い悩みを解決できるココナラ候補</h2>
      <p>
        価格やレビュー数だけで決めず、過去実績、修正範囲、説明文の具体性を見比べてください。
        表示している価格・評価は記事生成時点の取得情報です。最新の提供内容は各サービスページで確認しましょう。
      </p>
      <article className="recommended-comparison">
        <p className="recommend-label">今回のおすすめ</p>
        <div className="recommended-content">
          {recommended.imageUrl ? (
            <span className="recommended-image">
              <img alt={`${recommended.title}のサービス画像`} src={recommended.imageUrl} />
            </span>
          ) : null}
          <div>
            <h3>{recommended.title}</h3>
            <p>{article.recommendedComparisonReason || "まずはこの候補を基準にして、価格、実績、修正範囲を他のサービスと見比べるのがおすすめです。"}</p>
            {recommended.affiliateMaterial ? (
              <AffiliateMaterialLink className="comparison-link" material={recommended.affiliateMaterial}>
                ココナラで詳細を見る
              </AffiliateMaterialLink>
            ) : (
              null
            )}
          </div>
        </div>
      </article>
      <div className="comparison-grid">
        {others.map((item) => (
          <article className="comparison-card" key={item.id}>
            {item.imageUrl ? (
              <span className="comparison-image">
                <img alt={`${item.title}のサービス画像`} src={item.imageUrl} />
              </span>
            ) : null}
            <div className="comparison-card-body">
              <h3>{item.title}</h3>
              <dl>
                {item.sellerName ? (
                  <>
                    <dt>出品者</dt>
                    <dd>{item.sellerName}</dd>
                  </>
                ) : null}
                {item.price ? (
                  <>
                    <dt>価格目安</dt>
                    <dd>{formatPrice(item.price, item.priceCurrency)}</dd>
                  </>
                ) : null}
                {item.ratingValue ? (
                  <>
                    <dt>評価</dt>
                    <dd>{item.ratingValue}{item.reviewCount ? ` (${item.reviewCount}件)` : ""}</dd>
                  </>
                ) : null}
              </dl>
              {item.affiliateMaterial ? (
                <AffiliateMaterialLink className="comparison-link" material={item.affiliateMaterial}>
                  ココナラで詳細を見る
                </AffiliateMaterialLink>
              ) : (
                null
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OfficialSources({ article }) {
  const sources = article.officialSources || [];
  if (!sources.length) return null;

  return (
    <section className="official-sources" aria-label="参考にした公式情報">
      <p className="eyebrow">公式情報</p>
      <h2>{nicheConfig.generation.sourceName}の情報を確認しています</h2>
      <ul>
        {sources.slice(0, 3).map((source) => (
          <li key={source.url}>
            <a href={source.url} rel="noopener noreferrer" target="_blank">
              {source.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SocialReactions({ embeds }) {
  if (!embeds.length) return null;

  return (
    <section className="social-reactions" aria-label="SNSで見られる声">
      <p className="eyebrow">SNSの声</p>
      <h2>依頼前に近い悩みや使い方を見ておく</h2>
      <XPostCarousel embeds={embeds} />
    </section>
  );
}

function InlineAffiliateLink({ article, material }) {
  if (!material?.href || material.href === "#") return null;

  const text = article.category === "trouble" ? nicheConfig.affiliate.troubleInlineText : nicheConfig.affiliate.inlineText;

  return (
    <p className="inline-affiliate-note">
      {text}{" "}
      <AffiliateMaterialLink className="inline-affiliate-link" material={material}>
        {material.linkText || `${nicheConfig.affiliate.storeName}で探す`}
      </AffiliateMaterialLink>
    </p>
  );
}

function AffiliateCta({ article, label, material }) {
  const cta = article.affiliateCta || {};
  const href = material?.href && material.href !== "#" ? material.href : cta.url || "#";
  const buttonText = nicheConfig.affiliate.buttonText;

  return (
    <div className="cta-box">
      <p className="cta-label">{label}</p>
      <h2>{cta.headline || `${nicheConfig.generation.fallbackProductName}の依頼先を比較する`}</h2>
      <p>{cta.body || `価格、納期、修正範囲、過去実績は出品者ごとに異なります。依頼前に${nicheConfig.affiliate.storeName}で最新情報を確認しておくと安心です。`}</p>
      {href && href !== "#" ? (
        <AffiliateMaterialLink className="cta-button" material={{ ...material, href }}>
          {buttonText}
        </AffiliateMaterialLink>
      ) : null}
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function formatPrice(value, currency = "JPY") {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
