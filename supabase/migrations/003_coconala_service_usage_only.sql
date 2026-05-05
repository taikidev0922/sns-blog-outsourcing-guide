create table if not exists public.coconala_service_usage (
  service_url text primary key,
  service_id text,
  offer_id text not null,
  product text not null,
  title text,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  first_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coconala_service_usage_log (
  id uuid primary key default gen_random_uuid(),
  service_url text not null references public.coconala_service_usage(service_url) on delete cascade,
  service_id text,
  article_slug text not null,
  article_title text,
  offer_id text,
  product text,
  used_at timestamptz not null default now()
);

create index if not exists coconala_service_usage_selection_idx
  on public.coconala_service_usage (product, offer_id, usage_count asc, last_used_at asc nulls first);

create index if not exists coconala_service_usage_log_article_idx
  on public.coconala_service_usage_log (article_slug, used_at desc);

alter table public.coconala_service_usage enable row level security;
alter table public.coconala_service_usage_log enable row level security;

create or replace function public.touch_coconala_service_usage_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists coconala_service_usage_touch_updated_at on public.coconala_service_usage;
create trigger coconala_service_usage_touch_updated_at
before update on public.coconala_service_usage
for each row execute function public.touch_coconala_service_usage_updated_at();

create or replace function public.increment_coconala_service_url_usage(
  target_service_url text,
  target_service_id text,
  target_offer_id text,
  target_product text,
  target_title text
)
returns void as $$
begin
  insert into public.coconala_service_usage (
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
    target_service_url,
    target_service_id,
    target_offer_id,
    target_product,
    target_title,
    1,
    now(),
    now()
  )
  on conflict (service_url) do update
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
