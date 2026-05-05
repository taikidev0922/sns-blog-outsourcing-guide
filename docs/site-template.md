# Affiliate Site Template Guide

This project is now organized so a second affiliate site can reuse the same engine and replace niche-specific settings.

## Main Swap File

Edit `lib/niche-config.js` first.

This file owns:

- Site name, URL, meta title, description
- Header navigation and hero copy
- Product/category labels and sidebar links
- Seed keyword plans and Rakko seed keywords
- Affiliate CTA wording and fallback affiliate URL env name
- Claude role/instructions and fallback article wording
- Official source endpoint and cache settings

For a second domain, copy this repo and change `nicheConfig` before changing page components.

## Usually Reused As-Is

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

## Niche-Specific Files

These are expected to change per site:

- `lib/niche-config.js`
- `data/affiliate-materials.json`
- `docs/affiliate-materials.md`
- Official source collector implementation if the niche does not have a WordPress REST endpoint
- Any scripts that explicitly collect a brand's products

## Environment Variables To Revisit Per Site

- `ARTICLE_PIPELINE_MODE`
- `RAKKO_KEYWORD_API_KEY`
- `RAKKO_KEYWORD_LIVE`
- `ANTHROPIC_API_KEY`
- `CLAUDE_ARTICLE_LIVE`
- `OPENAI_API_KEY`
- `OPENAI_IMAGE_LIVE`
- `X_BEARER_TOKEN`
- `X_POST_SEARCH_LIVE`
- `BLOB_READ_WRITE_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- The affiliate fallback URL env configured by `nicheConfig.affiliate.fallbackUrlEnv`

## Good Expansion Pattern

1. Clone this project.
2. Change `lib/niche-config.js`.
3. Replace affiliate materials.
4. Replace seed keywords.
5. Replace official source settings or disable official source fetching.
6. Run `npm run build`.
7. Deploy to a new Vercel project.
8. Add the new domain and production env vars.
9. Start in test mode, then switch to daily production cron.

## Avoid

- Publishing many domains with identical copy, UI, and article angles.
- Mixing unrelated reader intents in one domain.
- Letting a new niche inherit SwitchBot-specific affiliate materials.
- Enabling paid APIs before test mode is confirmed.
