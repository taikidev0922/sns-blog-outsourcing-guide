create table if not exists article_page_view_counts (
  article_slug text primary key,
  view_count integer not null default 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz
);

create table if not exists article_page_view_events (
  id bigserial primary key,
  article_slug text not null,
  viewed_at timestamptz not null default now(),
  referrer text,
  user_agent text
);

create index if not exists article_page_view_counts_rank_idx
  on article_page_view_counts (view_count desc, last_viewed_at desc);

create index if not exists article_page_view_events_slug_viewed_idx
  on article_page_view_events (article_slug, viewed_at desc);

alter table article_page_view_counts enable row level security;
alter table article_page_view_events enable row level security;

create or replace function increment_article_page_view(
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

  insert into article_page_view_events (article_slug, referrer, user_agent)
  values (target_slug, left(target_referrer, 500), left(target_user_agent, 500));

  insert into article_page_view_counts (article_slug, view_count, first_viewed_at, last_viewed_at)
  values (target_slug, 1, now(), now())
  on conflict (article_slug)
  do update set
    view_count = article_page_view_counts.view_count + 1,
    last_viewed_at = now();
end;
$$;
