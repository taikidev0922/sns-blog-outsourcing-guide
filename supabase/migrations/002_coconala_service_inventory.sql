create table if not exists public.coconala_service_inventory (
  id text primary key,
  service_id text,
  offer_id text not null,
  product text not null,
  target_label text,
  allowed_category text,
  source_category_url text,
  source_keyword text,
  source_url text,
  rank integer,
  title text not null,
  service_url text not null unique,
  price integer,
  price_currency text not null default 'JPY',
  availability text,
  seller_name text,
  seller_url text,
  image_url text,
  description text,
  rating_value numeric,
  review_count integer,
  affiliate_status text not null default 'needs-a8-link',
  affiliate_html text,
  affiliate_href text,
  affiliate_impression_url text,
  affiliate_link_text text,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coconala_service_usage_events (
  id uuid primary key default gen_random_uuid(),
  service_inventory_id text not null references public.coconala_service_inventory(id) on delete cascade,
  article_slug text not null,
  article_title text,
  offer_id text,
  product text,
  used_at timestamptz not null default now()
);

create table if not exists public.coconala_inventory_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'coconala',
  status text not null,
  fetched_count integer not null default 0,
  queued_a8_count integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists coconala_service_inventory_selection_idx
  on public.coconala_service_inventory (product, offer_id, affiliate_status, usage_count asc, last_used_at asc nulls first, review_count desc nulls last);

create index if not exists coconala_service_usage_events_article_idx
  on public.coconala_service_usage_events (article_slug, used_at desc);

alter table public.coconala_service_inventory enable row level security;
alter table public.coconala_service_usage_events enable row level security;
alter table public.coconala_inventory_refresh_runs enable row level security;

create or replace function public.touch_coconala_service_inventory_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists coconala_service_inventory_touch_updated_at on public.coconala_service_inventory;
create trigger coconala_service_inventory_touch_updated_at
before update on public.coconala_service_inventory
for each row execute function public.touch_coconala_service_inventory_updated_at();

create or replace function public.increment_coconala_service_usage(target_inventory_id text)
returns void as $$
begin
  update public.coconala_service_inventory
  set
    usage_count = usage_count + 1,
    last_used_at = now(),
    updated_at = now()
  where id = target_inventory_id;
end;
$$ language plpgsql security definer;
