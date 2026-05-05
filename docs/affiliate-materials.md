# Affiliate Materials

This site uses the Coconala production/order-category program on A8.net.

## Program Link Rules

A8の商品リンク作成では、リンク先URLを `https://coconala.com/` 内、かつ以下の許可カテゴリ配下に設定します。

- Webサイト制作・Webデザイン: `https://coconala.com/categories/22`
- デザイン: `https://coconala.com/categories/18`
- 動画・アニメーション・撮影: `https://coconala.com/categories/10`
- イラスト・モデリング・漫画: `https://coconala.com/categories/9`
- 音楽・ナレーション: `https://coconala.com/categories/23`
- ライティング・翻訳: `https://coconala.com/categories/19`
- IT・プログラミング・開発: `https://coconala.com/categories/11`
- ビジネス代行・アシスタント: `https://coconala.com/categories/13`
- コンサルティング・士業: `https://coconala.com/categories/27`
- AI: `https://coconala.com/categories/28`

カテゴリ一覧ページ、出品者プロフィールページ、サービスページを商品リンク先にできます。

## Important

- A8で生成されたリンクは改変しない。
- 個別サービスは出品停止や価格変更が起きるため、記事本文では価格や提供内容を断定しすぎない。
- 記事の初期表示付近に広告利用の開示を置く。
- 公開後の記事URLはA8の広告掲載URL管理へ登録する。

## Current Data File

The canonical machine-readable list is:

- `data/affiliate-materials.json`

The current entries are placeholders with `href: "#"`.
Replace each `href` with the exact A8-generated product link after creating it.
Keep `destinationUrl` as an internal note only; rendering uses `href`.

## Recommended Product Link Targets

- `sns-icon`: `https://coconala.com/categories/9`
- `blog-logo`: `https://coconala.com/categories/18`
- `youtube-thumbnail`: `https://coconala.com/categories/22`
- `kindle-cover`: `https://coconala.com/categories/18`
- `note-header`: `https://coconala.com/categories/22`
- `profile-copy`: `https://coconala.com/categories/19`
- `article-edit`: `https://coconala.com/categories/19`
- `blog-parts`: `https://coconala.com/categories/22`

When a high-quality individual service is selected, generate an A8 product link for that service page and add it with the matching `product` key. The selection logic prefers exact product matches over the general fallback.
