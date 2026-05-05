import { absoluteUrl, siteConfig } from "../../lib/site-config";
import { nicheConfig } from "../../lib/niche-config";

export const metadata = {
  title: "プライバシーポリシー",
  description: `${siteConfig.name}のプライバシーポリシーです。アクセス解析、広告配信、個人情報の取り扱いについて記載しています。`,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: `プライバシーポリシー | ${siteConfig.name}`,
    description: `${siteConfig.name}のプライバシーポリシーです。`,
    url: absoluteUrl("/privacy"),
    type: "article",
  },
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <p className="eyebrow">Policy</p>
      <h1>プライバシーポリシー</h1>
      <p>
        {siteConfig.name}（以下「当サイト」）では、サイト運営、コンテンツ改善、広告配信のために必要な範囲で情報を取り扱います。
      </p>

      <h2>アクセス解析について</h2>
      <p>
        当サイトでは、閲覧状況を把握しコンテンツ改善に役立てるため、アクセス解析を利用する場合があります。取得される情報は個人を直接特定するものではありません。
      </p>

      <h2>広告とアフィリエイトについて</h2>
      <p>{nicheConfig.disclosure}</p>
      <p>
        広告リンクを経由してサービスを利用した場合、当サイト運営者に報酬が発生することがあります。掲載内容は記事作成時点の情報をもとにしていますが、価格、提供内容、納期、キャンペーンなどは変更される場合があります。
      </p>

      <h2>Cookieについて</h2>
      <p>
        当サイトや広告配信事業者は、利便性向上、アクセス解析、広告効果測定のためにCookieを使用する場合があります。Cookieはブラウザ設定から無効にできます。
      </p>

      <h2>免責事項</h2>
      <p>
        当サイトの情報は正確性に配慮して掲載していますが、内容の完全性や最新性を保証するものではありません。サービス利用前には、必ず公式ページや販売ページで最新情報をご確認ください。
      </p>
    </main>
  );
}
