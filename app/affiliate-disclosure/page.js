import { absoluteUrl, siteConfig } from "../../lib/site-config";
import { nicheConfig } from "../../lib/niche-config";

export const metadata = {
  title: "アフィリエイト開示",
  description: `${siteConfig.name}の広告掲載方針とアフィリエイトリンクの扱いについて記載しています。`,
  alternates: {
    canonical: "/affiliate-disclosure",
  },
  openGraph: {
    title: `アフィリエイト開示 | ${siteConfig.name}`,
    description: `${siteConfig.name}の広告掲載方針です。`,
    url: absoluteUrl("/affiliate-disclosure"),
    type: "article",
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="legal-page">
      <p className="eyebrow">Disclosure</p>
      <h1>アフィリエイト開示</h1>
      <p>{nicheConfig.disclosure}</p>

      <h2>広告リンクについて</h2>
      <p>
        当サイトの記事には、A8.netなどのアフィリエイトプログラムを通じた広告リンクが含まれる場合があります。リンク先でサービスの購入や申し込みが行われた場合、当サイト運営者に報酬が発生することがあります。
      </p>

      <h2>掲載判断について</h2>
      <p>
        記事では、読者が依頼前に比較しやすいよう、サービス内容、価格目安、評価、レビュー数、依頼前の確認点などを整理しています。広告報酬の有無だけで掲載内容を決定するものではありません。
      </p>

      <h2>最新情報の確認</h2>
      <p>
        ココナラ上の出品内容、価格、評価、受付状況、納期、修正範囲などは変わる場合があります。申し込み前には、必ずリンク先の最新情報をご確認ください。
      </p>
    </main>
  );
}
