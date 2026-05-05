-- Make shared Supabase tables safe for multiple content projects.
-- Existing rows are assumed to belong to the original SwitchBot project.

alter table if exists public.keyword_candidates
  add column if not exists project_key text;

update public.keyword_candidates
set project_key = 'switchbot-life-guide'
where project_key is null;

alter table if exists public.keyword_candidates
  alter column project_key set default 'switchbot-life-guide',
  alter column project_key set not null;

alter table if exists public.keyword_usage_events
  add column if not exists project_key text;

update public.keyword_usage_events
set project_key = 'switchbot-life-guide'
where project_key is null;

alter table if exists public.keyword_usage_events
  alter column project_key set default 'switchbot-life-guide',
  alter column project_key set not null;

alter table if exists public.keyword_refresh_runs
  add column if not exists project_key text;

update public.keyword_refresh_runs
set project_key = 'switchbot-life-guide'
where project_key is null;

alter table if exists public.keyword_refresh_runs
  alter column project_key set default 'switchbot-life-guide',
  alter column project_key set not null;

alter table if exists public.keyword_usage_events
  drop constraint if exists keyword_usage_events_keyword_fkey;

alter table if exists public.keyword_candidates
  drop constraint if exists keyword_candidates_keyword_key;

create unique index if not exists keyword_candidates_project_keyword_key
  on public.keyword_candidates (project_key, keyword);

drop index if exists keyword_candidates_selection_idx;
create index if not exists keyword_candidates_project_selection_idx
  on public.keyword_candidates (project_key, usage_count asc, last_used_at asc nulls first, discovered_at desc);

drop index if exists keyword_refresh_runs_provider_created_idx;
create index if not exists keyword_refresh_runs_project_provider_created_idx
  on public.keyword_refresh_runs (project_key, provider, created_at desc);

create or replace function public.increment_keyword_usage(
  target_project_key text,
  target_keyword text
)
returns void as $$
begin
  update public.keyword_candidates
  set
    usage_count = usage_count + 1,
    last_used_at = now(),
    updated_at = now()
  where project_key = target_project_key
    and keyword = target_keyword;
end;
$$ language plpgsql security definer;

create or replace function public.increment_keyword_usage(target_keyword text)
returns void as $$
begin
  perform public.increment_keyword_usage('switchbot-life-guide', target_keyword);
end;
$$ language plpgsql security definer;

alter table if exists public.article_page_view_counts
  add column if not exists project_key text;

update public.article_page_view_counts
set project_key = 'switchbot-life-guide'
where project_key is null;

alter table if exists public.article_page_view_counts
  alter column project_key set default 'switchbot-life-guide',
  alter column project_key set not null;

alter table if exists public.article_page_view_events
  add column if not exists project_key text;

update public.article_page_view_events
set project_key = 'switchbot-life-guide'
where project_key is null;

alter table if exists public.article_page_view_events
  alter column project_key set default 'switchbot-life-guide',
  alter column project_key set not null;

alter table if exists public.article_page_view_counts
  drop constraint if exists article_page_view_counts_pkey;

alter table if exists public.article_page_view_counts
  add constraint article_page_view_counts_pkey primary key (project_key, article_slug);

drop index if exists article_page_view_counts_rank_idx;
create index if not exists article_page_view_counts_project_rank_idx
  on public.article_page_view_counts (project_key, view_count desc, last_viewed_at desc);

drop index if exists article_page_view_events_slug_viewed_idx;
create index if not exists article_page_view_events_project_slug_viewed_idx
  on public.article_page_view_events (project_key, article_slug, viewed_at desc);

create or replace function public.increment_article_page_view(
  target_project_key text,
  target_slug text,
  target_referrer text default null,
  target_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_slug is null or length(trim(target_slug)) = 0 then
    return;
  end if;

  insert into public.article_page_view_events (project_key, article_slug, referrer, user_agent)
  values (target_project_key, target_slug, left(target_referrer, 500), left(target_user_agent, 500));

  insert into public.article_page_view_counts (project_key, article_slug, view_count, first_viewed_at, last_viewed_at)
  values (target_project_key, target_slug, 1, now(), now())
  on conflict (project_key, article_slug)
  do update set
    view_count = public.article_page_view_counts.view_count + 1,
    last_viewed_at = now();
end;
$$;

create or replace function public.increment_article_page_view(
  target_slug text,
  target_referrer text default null,
  target_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.increment_article_page_view('switchbot-life-guide', target_slug, target_referrer, target_user_agent);
end;
$$;

alter table if exists public.coconala_service_usage
  add column if not exists project_key text;

update public.coconala_service_usage
set project_key = 'sns-blog-outsourcing-guide'
where project_key is null;

alter table if exists public.coconala_service_usage
  alter column project_key set default 'sns-blog-outsourcing-guide',
  alter column project_key set not null;

alter table if exists public.coconala_service_usage_log
  add column if not exists project_key text;

update public.coconala_service_usage_log
set project_key = 'sns-blog-outsourcing-guide'
where project_key is null;

alter table if exists public.coconala_service_usage_log
  alter column project_key set default 'sns-blog-outsourcing-guide',
  alter column project_key set not null;

alter table if exists public.coconala_service_usage_log
  drop constraint if exists coconala_service_usage_log_service_url_fkey;

alter table if exists public.coconala_service_usage
  drop constraint if exists coconala_service_usage_pkey;

alter table if exists public.coconala_service_usage
  add constraint coconala_service_usage_pkey primary key (project_key, service_url);

drop index if exists coconala_service_usage_selection_idx;
create index if not exists coconala_service_usage_project_selection_idx
  on public.coconala_service_usage (project_key, product, offer_id, usage_count asc, last_used_at asc nulls first);

drop index if exists coconala_service_usage_log_article_idx;
create index if not exists coconala_service_usage_log_project_article_idx
  on public.coconala_service_usage_log (project_key, article_slug, used_at desc);

create or replace function public.increment_coconala_service_url_usage(
  target_project_key text,
  target_service_url text,
  target_service_id text,
  target_offer_id text,
  target_product text,
  target_title text
)
returns void as $$
begin
  insert into public.coconala_service_usage (
    project_key,
    service_url,
    service_id,
    offer_id,
    product,
    title,
    usage_count,
    first_used_at,
    last_used_at
  )
  values (
    target_project_key,
    target_service_url,
    target_service_id,
    target_offer_id,
    target_product,
    target_title,
    1,
    now(),
    now()
  )
  on conflict (project_key, service_url) do update
  set
    service_id = excluded.service_id,
    offer_id = excluded.offer_id,
    product = excluded.product,
    title = excluded.title,
    usage_count = public.coconala_service_usage.usage_count + 1,
    last_used_at = now(),
    updated_at = now();
end;
$$ language plpgsql security definer;

create or replace function public.increment_coconala_service_url_usage(
  target_service_url text,
  target_service_id text,
  target_offer_id text,
  target_product text,
  target_title text
)
returns void as $$
begin
  perform public.increment_coconala_service_url_usage(
    'sns-blog-outsourcing-guide',
    target_service_url,
    target_service_id,
    target_offer_id,
    target_product,
    target_title
  );
end;
$$ language plpgsql security definer;
