import Link from "next/link";
import { AffiliateMaterialLink } from "./affiliate-material-link";
import { findAffiliateMaterial } from "../lib/affiliate-materials";
import { nicheConfig } from "../lib/niche-config";

const productLinks = nicheConfig.productLinks;
const troubleLinks = nicheConfig.troubleLinks;

export function SiteSidebar({ popularArticles = [] }) {
  const material = findAffiliateMaterial({ product: "general", category: "request", placement: "sidebar", type: "banner" });

  return (
    <aside className="sidebar" aria-label="サイドバー">
      <section className="sidebar-block affiliate-panel">
        <p className="sidebar-kicker">{nicheConfig.affiliate.sidebarKicker}</p>
        <h2>{nicheConfig.affiliate.sidebarHeading}</h2>
        <AffiliateMaterialLink className={material?.imageUrl ? "sidebar-banner" : "sidebar-cta"} material={material}>
          {material?.linkText || `${nicheConfig.affiliate.storeName}で探す`}
        </AffiliateMaterialLink>
      </section>

      <section className="sidebar-block">
        <h2>制作カテゴリ</h2>
        <nav className="side-link-list" aria-label="制作カテゴリ">
          {productLinks.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="sidebar-block">
        <h2>よく読まれる記事</h2>
        <ol className="popular-list">
          {popularArticles.length ? (
            popularArticles.slice(0, 3).map((article) => (
              <li key={article.slug}>
                <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              </li>
            ))
          ) : (
            <li>
              <span>記事公開後に自動で表示されます</span>
            </li>
          )}
        </ol>

        <h2 className="sidebar-subtitle">悩み別</h2>
        <nav className="side-link-list trouble-links" aria-label="悩み別リンク">
          {troubleLinks.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
      </section>
    </aside>
  );
}
