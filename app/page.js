import Image from "next/image";
import Link from "next/link";
import { ArticleBadge } from "../components/article-badge";
import { SiteSidebar } from "../components/site-sidebar";
import { getPopularArticles } from "../lib/article-views";
import { articleHref } from "../lib/links";
import { readArticles } from "../lib/articles-store";
import { siteConfig } from "../lib/site-config";
import { nicheConfig } from "../lib/niche-config";

export const dynamic = "force-dynamic";

const intentCards = nicheConfig.intentCards;

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const articles = await readArticles();
  const filteredArticles = filterArticles(articles, params);
  const popularArticles = await getPopularArticles(articles);

  return (
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildHomeJsonLd()) }}
      />
      <main className="main-content">
        <section className="home-hero">
          <p className="eyebrow">{nicheConfig.hero.eyebrow}</p>
          <h1>{nicheConfig.hero.title}</h1>
          <p>{nicheConfig.hero.body}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#articles">{nicheConfig.hero.primaryAction}</a>
            <a className="secondary-action" href={nicheConfig.hero.secondaryHref}>{nicheConfig.hero.secondaryAction}</a>
          </div>
        </section>

        <section className="intent-section" aria-labelledby="intent-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Navigation</p>
              <h2 id="intent-title">依頼したい制作物から探す</h2>
            </div>
          </div>
          <div className="intent-grid">
            {intentCards.map(([title, description, href]) => (
              <Link href={href} key={href}>
                <strong>{title}</strong>
                <span>{description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="article-list-section" id="articles" aria-labelledby="articles-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Articles</p>
              <h2 id="articles-title">記事一覧</h2>
            </div>
            <p className="count-pill">{filteredArticles.length}件</p>
          </div>

          {filteredArticles.length ? (
            <div className="article-grid">
              {filteredArticles.map((article) => (
                <Link className="article-list-card" href={articleHref(article.slug)} key={article.slug}>
                  <span className="article-thumb">
                    <Image src={article.imageUrl} alt={`${article.title}のアイキャッチ画像`} fill sizes="(max-width: 720px) 100vw, (max-width: 1020px) 50vw, 260px" />
                  </span>
                  <ArticleBadge category={article.category} />
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <small>
                    {formatDate(article.publishedAt)} ・ {article.readingMinutes}分で読める
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>記事はまだありません</h3>
              <p>
                記事生成を開始すると、SNSアイコン・似顔絵、ロゴ作成、YouTubeサムネイル、SNSプロフィール文などの依頼ガイドがここに追加されます。
              </p>
            </div>
          )}
        </section>
      </main>

      <SiteSidebar popularArticles={popularArticles} />
    </div>
  );
}

function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "ja-JP",
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

function filterArticles(articles, params = {}) {
  const category = params.category;
  const product = params.product;
  const intent = params.intent;

  return articles.filter((article) => {
    if (category && article.category !== category) return false;
    if (product && article.product !== product) return false;
    if (intent && article.intent !== intent) return false;
    return true;
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}
