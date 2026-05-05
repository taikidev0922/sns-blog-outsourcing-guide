# Article Generation Pipeline

## Roles

- Rakko Keyword API: keyword discovery only.
- Supabase: keyword inventory, Coconala service usage counts, product usage history, and refresh history.
- Claude API: article body generation.
- OpenAI API: article image generation.
- X API: optional social reaction discovery in production mode.
- Vercel Blob: published article JSON and generated image assets.
- Vercel Cron: scheduled orchestration.
- A8.net: Coconala product links generated through the A8 product-link screen at article generation time and stored in the article snapshot without modification.

## Offer-First Flow

This site should choose a target offer/category before writing an article.

1. Select a `targetOffer` from `lib/niche-config.js`.
2. Select or discover a keyword for that offer.
3. Fetch current Coconala service candidates for that offer/category.
4. Select up to 3 services from the same article theme, prioritizing lower `usage_count` and older `last_used_at`.
5. Generate A8 product links only for the selected services.
6. Generate an article around the reader problem and the selected comparison set.
7. Render the services as a comparison section, using the exact A8-generated HTML fields when available.
8. Store only the article snapshot and product usage history.

Product links must be generated in A8 and copied without modification.

## Live Service Selection Flow

The production path does not keep a large long-term Coconala service inventory. This avoids publishing stale prices, review counts, seller names, or ratings from old inventory rows.

At article generation time:

1. `selectServicesForArticle()` fetches the current Coconala category/search result for the chosen offer.
2. Candidates are filtered by the offer in `lib/niche-config.js`, so unrelated genres are not compared in the same article.
3. Supabase `coconala_service_usage` is used only to avoid overusing the same service URL.
4. The selected services are snapshotted into `comparisonItems` with `collectedAt`.
5. `attachGeneratedAffiliateLinks()` generates A8 text links for those selected services when A8 credentials are configured.
6. `markServicesUsedForArticle()` increments usage and writes `coconala_service_usage_log`.

Required environment variables:

```text
A8_LOGIN_ID
A8_PASSWORD
```

Optional:

```text
A8_GENERATE_LIMIT=5
A8_HEADLESS=true
A8_GOODS_LINK_URL=https://pub.a8.net/a8v2/media/goodsLinkAction.do?insId=s00000012624009
```

The generated `<a>` tag and 1px tracking `<img>` are stored in the article as raw HTML plus parsed `affiliate_href`, `affiliate_impression_url`, and `affiliate_link_text`. Do not edit the generated URL manually.

The older `coconala_service_inventory` table and local inventory scripts are legacy investigation tools. They are not part of the production article path.

## Cost Controls

The pipeline has two explicit modes:

- `ARTICLE_PIPELINE_MODE=test`: pre-launch mode. Rakko and X are disabled. Claude and OpenAI only run when the `TEST_*` flags are explicitly enabled.
- `ARTICLE_PIPELINE_MODE=production`: launch mode. Production flags and production model defaults are used.

With the default test environment, Cron can run without consuming Rakko, Claude, OpenAI, or X API credits.

### Test Mode

- `TEST_CLAUDE_ARTICLE_LIVE=true`: allow Claude article generation in test mode.
- `TEST_ANTHROPIC_MODEL=claude-haiku-4-5-20251001`: low-cost Claude model for test mode.
- `TEST_CLAUDE_MAX_TOKENS=900`: shorter test-mode article output.
- `TEST_OPENAI_IMAGE_LIVE=true`: allow OpenAI image generation in test mode.
- `TEST_OPENAI_IMAGE_MODEL=gpt-image-1-mini`: lower-cost image model for test mode.
- `TEST_OPENAI_IMAGE_QUALITY=low`: low image quality setting for test mode.
- `TEST_OPENAI_IMAGE_SIZE=1024x1024`: smaller image size for test mode.

### Production Mode

- `RAKKO_KEYWORD_LIVE=true`: allow Rakko API refresh.
- `RAKKO_REFRESH_INTERVAL_DAYS=14`: minimum days between Rakko refresh runs.
- `RAKKO_KEYWORD_FETCH_LIMIT=12`: max keyword candidates fetched per Rakko profile call.
- `RAKKO_MIN_CANDIDATES_PER_TIER=4`: when the next publishing bucket has fewer unused candidates, Rakko refresh can run even if the normal refresh interval has not elapsed.
- `CLAUDE_ARTICLE_LIVE=true`: allow Claude article generation.
- `ANTHROPIC_MODEL=claude-sonnet-4-6`: production article model.
- `OPENAI_IMAGE_LIVE=true`: allow OpenAI image generation.
- `OPENAI_IMAGE_MODEL=gpt-image-2`: image generation model.
- `X_POST_SEARCH_LIVE=true`: allow X post search in production mode.
- `X_BEARER_TOKEN`: bearer token for X API recent search.

## Quality Design

Each article carries structured decision data:

- `targetOffer`: the Coconala category/service theme being promoted.
- `comparisonItems`: multiple Coconala service candidates selected for the article.
- `verdict`: self-made vs outsourced conclusion near the top.
- `buyingGuide.bestFor`: readers who are a good fit.
- `buyingGuide.checkPoints`: request checklist before CTA.
- `buyingGuide.cautions`: reasons to pause or verify.
- `affiliateCta`: article-specific CTA headline, body, button text, and fallback URL.
- `quality`: score and checklist for automated quality gates.

Production mode refuses to publish articles below `MIN_ARTICLE_QUALITY_SCORE`, defaulting to `70`.

## Keyword Diversity Design

Rakko Keyword API is used for a mixed SEO portfolio, not only for high-volume keywords.

The refresh step stores candidates in these keyword tiers inside `metrics.keywordTier`:

- `head`: high-volume, often higher-difficulty keywords for foundational articles.
- `middle`: moderate-volume keywords for practical decision articles.
- `long-tail-low-competition`: low-volume and lower-difficulty keywords for niche reader problems.
- `emerging`: recently detected or newer-looking keywords for timely angles.

Publishing rotates through those tiers so the site does not become a stack of similar mainstream articles. If a target tier is understocked, the pipeline can call Rakko for that tier even when the normal refresh interval would otherwise skip the API call.

Claude receives the keyword tier, search volume, and SEO difficulty. For long-tail keywords, the prompt explicitly asks it to keep the article narrow and situation-specific instead of turning the topic into generic outsourcing advice.

## Official Source Fetching

The copied SwitchBot official-blog fetcher is disabled for this site.

For Coconala, article text can show the service snapshot collected at generation time, but should still avoid hard claims about delivery terms or availability. The generated copy should direct readers to confirm current details on Coconala before purchase.

## Supabase Setup

Run:

```sql
-- supabase/migrations/001_keyword_management.sql
-- supabase/migrations/003_coconala_service_usage_only.sql
-- supabase/migrations/004_drop_legacy_coconala_inventory.sql
```

`002_coconala_service_inventory.sql` is legacy. If it exists in an older database, `004_drop_legacy_coconala_inventory.sql` removes those unused inventory tables and functions.

Required Vercel environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Use `SUPABASE_SERVICE_ROLE_KEY` only on the server. Do not expose it to the browser.

Migration scripts can optionally use `SUPABASE_DB_DIRECT_URL` or `SUPABASE_DB_URL`; if you do not set them locally, run the SQL files in Supabase SQL Editor instead.
