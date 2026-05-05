# Codex Handoff: SNS/Blog Outsourcing Guide

This project is a copied template of the completed SwitchBot affiliate site.

The original SwitchBot project lives at:

- `C:\Users\taiki\dev\switchbot-life-guide`
- GitHub: `https://github.com/taikidev0922/switchbot-life-guide`
- Vercel project: `switchbot-life-guide`

Do not edit the SwitchBot project for this Coconala site.

## New Site Goal

Build a separate Coconala affiliate media site for:

- SNS operators
- Blog operators
- creators/personal brands who need production work outsourced

The site should guide readers from a concrete production problem to a natural Coconala service request.

Good article themes:

- SNS icon request
- X/Twitter profile image request
- blog logo request
- YouTube thumbnail request
- Kindle cover request
- note header image request
- profile text writing/editing
- article editing/rewrite request
- blog design parts
- Canva limitations and when to outsource

Avoid turning this into a general "anything Coconala" site.

## Folder Strategy

The parent folder is:

- `C:\Users\taiki\dev\coconala-sites`

This parent is intended to contain multiple Coconala affiliate sites in the future.

Current child site:

- `sns-blog-outsourcing-guide`

Future possible child sites:

- `small-business-outsourcing-guide`
- `design-request-guide`
- `wedding-event-creative-guide`

Read the parent memo:

- `C:\Users\taiki\dev\coconala-sites\README.md`

## Affiliate Program To Use

Use the Coconala production/order-category program, not the broader all-category program.

Program details from A8:

- Program ID: `s00000012624009`
- Name: `TVCM放映で知名度UP★ココナラ｜Webサイト・デザイン・動画・イラストなど発注者 募集(18-1129)`
- Reward:
  - New free member registration: 100 yen
  - New purchase: 2500 yen
- Bonus:
  - 5 confirmed new purchases in a month: +1500 yen per purchase
- EPC: 12.28
- Approval rate: 98.82%
- Cookie/revisit period: 90 days
- Status: partnered

Allowed destination categories:

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

Important:

- Product links must point within `https://coconala.com/`.
- For this program, product links should stay under the allowed category pages above.
- Do not send traffic to categories outside the allowed production/order program.
- Do not modify generated A8 product links manually after creation.
- Ads need clear ad disclosure near the first view.
- Public article URLs should be submitted via A8's ad placement URL management after publishing.

## Initial Technical State

This folder was copied from the SwitchBot project while excluding:

- `.git`
- `.vercel`
- `.next`
- `node_modules`
- `.env.local`
- dev logs

So this is not yet connected to GitHub or Vercel.

The template engine is centered on:

- `lib/niche-config.js`

For this new site, first rewrite that file from SwitchBot to Coconala/SNS-blog outsourcing.

Also replace:

- `data/affiliate-materials.json`
- `docs/affiliate-materials.md`
- SwitchBot-specific product collection scripts if they are not useful
- official source fetching logic if needed

## Important Template Files

Common reusable engine:

- `app/api/cron/publish-dummy/route.js`
- `lib/articles-store.js`
- `lib/keyword-store.js`
- `lib/pipeline-mode.js`
- `lib/claude-articles.js`
- `lib/openai-images.js`
- `lib/x-posts.js`
- `app/sitemap.js`
- `app/robots.js`
- `components/x-post-carousel.js`

Niche-specific config:

- `lib/niche-config.js`

Template documentation:

- `docs/site-template.md`

## Suggested First Steps For New Codex

1. Inspect `lib/niche-config.js`.
2. Replace SwitchBot settings with SNS/blog outsourcing settings.
3. Create Coconala-focused category/product labels.
4. Replace keyword seed plans.
5. Disable or replace SwitchBot official blog source fetching.
6. Replace affiliate material data with Coconala A8 links after user provides them.
7. Clear copied SwitchBot articles for the new site.
8. Run `npm install` if `node_modules` is missing.
9. Run `npm run build`.
10. Initialize a new Git repo and push to a new GitHub repo.
11. Create a new Vercel project for this site.
12. Set environment variables separately from the SwitchBot project.

## Suggested Site Positioning

Working concept:

`SNS・ブログ運営者向けの制作依頼ガイド`

Possible site names:

- `発信者の外注ガイド`
- `SNS制作依頼ガイド`
- `ブログ素材外注ナビ`
- `クリエイター依頼ラボ`

Recommended first domain/site scope:

Help readers decide what to make themselves and what to outsource for SNS/blog growth.

## SEO/Content Notes

Prioritize buyer-intent and problem-solving queries:

- `ブログ アイコン 作り方`
- `X アイコン 外注`
- `YouTube サムネイル 依頼`
- `Kindle 表紙 依頼`
- `note ヘッダー 作り方`
- `ブログ ロゴ 作成`
- `プロフィール文 添削`
- `Canva 限界 外注`

Article flow should be:

1. Reader problem
2. What can be self-made
3. Where self-made work tends to fail
4. Outsourcing checklist
5. How to choose a Coconala creator
6. Coconala CTA
7. Related articles

## User Preferences

- User wants automation, but cost control matters.
- Test mode should avoid paid APIs unless intentionally enabled.
- Production mode should eventually publish once per day.
- Keep test and production modes clearly separated.
- User is building multiple affiliate sites over time, so keep changes reusable.
