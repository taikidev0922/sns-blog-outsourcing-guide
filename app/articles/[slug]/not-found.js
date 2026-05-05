import Link from "next/link";

export default function ArticleNotFound() {
  return (
    <div className="page-shell page-shell-single">
      <main className="article-card article-not-found">
        <h1>記事が見つかりません</h1>
        <p>記事がまだ公開されていないか、URLが変更されています。</p>
        <Link className="cta-button" href="/">
          トップへ戻る
        </Link>
      </main>
    </div>
  );
}
