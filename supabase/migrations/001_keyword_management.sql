create extension if not exists pgcrypto;

create table if not exists public.keyword_candidates (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  source text not null default 'seed',
  category text,
  product text,
  intent text,
  metrics jsonb not null default '{}'::jsonb,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.keyword_usage_events (
  id uuid primary key default gen_random_uuid(),
  keyword text not null references public.keyword_candidates(keyword) on delete cascade,
  article_slug text not null,
  article_title text,
  source text not null,
  used_at timestamptz not null default now()
);

create table if not exists public.keyword_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'rakko',
  seed_keyword text,
  status text not null,
  fetched_count integer not null default 0,
  consumed_credit numeric not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists keyword_candidates_selection_idx
  on public.keyword_candidates (usage_count asc, last_used_at asc nulls first, discovered_at desc);

create index if not exists keyword_refresh_runs_provider_created_idx
  on public.keyword_refresh_runs (provider, created_at desc);

alter table public.keyword_candidates enable row level security;
alter table public.keyword_usage_events enable row level security;
alter table public.keyword_refresh_runs enable row level security;

create or replace function public.touch_keyword_candidates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists keyword_candidates_touch_updated_at on public.keyword_candidates;
create trigger keyword_candidates_touch_updated_at
before update on public.keyword_candidates
for each row execute function public.touch_keyword_candidates_updated_at();

create or replace function public.increment_keyword_usage(target_keyword text)
returns void as $$
begin
  update public.keyword_candidates
  set
    usage_count = usage_count + 1,
    last_used_at = now(),
    updated_at = now()
  where keyword = target_keyword;
end;
$$ language plpgsql security definer;
