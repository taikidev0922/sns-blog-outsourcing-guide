drop table if exists public.coconala_service_usage_events cascade;
drop table if exists public.coconala_inventory_refresh_runs cascade;
drop table if exists public.coconala_service_inventory cascade;

drop function if exists public.increment_coconala_service_usage(text);
drop function if exists public.touch_coconala_service_inventory_updated_at();
