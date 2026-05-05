# SNS・ブログ外注ガイド

SNS運用者・ブログ運営者・個人ブランド向けのココナラ affiliate media site です。

前プロジェクトの SwitchBot affiliate site template を流用しつつ、`lib/niche-config.js` を中心にココナラの制作・発注カテゴリ向けへ差し替えています。

## Content Strategy

- 先にターゲット依頼カテゴリを決める
- そのカテゴリからキーワード候補を作る
- 記事では自作できる範囲と外注した方がよい範囲を整理する
- CTA は記事テーマに近い A8 商品リンクを優先する
- 商品リンク未登録時は共通リンクまたはプレースホルダーへフォールバックする

## Main Files

- `lib/niche-config.js`: サイト設定、ターゲット依頼カテゴリ、キーワード計画
- `lib/article-generator.js`: fallback article generation
- `lib/claude-articles.js`: Claude article prompt
- `data/affiliate-materials.json`: A8 generated product links
- `docs/affiliate-materials.md`: A8 link operation notes
