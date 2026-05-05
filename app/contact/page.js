import { absoluteUrl, siteConfig } from "../../lib/site-config";

export const metadata = {
  title: "お問い合わせ",
  description: `${siteConfig.name}へのお問い合わせページです。掲載内容、広告掲載、修正依頼などの連絡方針を記載しています。`,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `お問い合わせ | ${siteConfig.name}`,
    description: `${siteConfig.name}へのお問い合わせについて。`,
    url: absoluteUrl("/contact"),
    type: "article",
  },
};

export default function ContactPage() {
  return (
    <main className="legal-page">
      <p className="eyebrow">Contact</p>
      <h1>お問い合わせ</h1>
      <p>
        掲載内容の修正依頼、広告掲載に関するご連絡、その他のお問い合わせは、運営者の管理する連絡窓口からお願いいたします。
      </p>

      <h2>掲載内容について</h2>
      <p>
        記事内の価格、評価、レビュー数、受付状況などは記事作成時点の情報をもとにしています。最新情報と差異がある場合は、確認のうえ必要に応じて修正します。
      </p>

      <h2>サービス提供者の方へ</h2>
      <p>
        掲載内容に関するご指摘、削除依頼、表記修正の希望がある場合は、対象記事URLと該当箇所が分かる形でご連絡ください。
      </p>
    </main>
  );
}
