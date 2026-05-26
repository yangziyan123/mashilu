-- Supabase phase 1 schema for migrating src/content/ips/*.md.
-- This keeps one public.ips table, uses snake_case columns in Postgres,
-- and stores the Markdown document body in body_markdown.

create extension if not exists pgcrypto;

create table if not exists public.ips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner text not null,
  type text not null,
  categories text[] not null default '{}',
  primary_direction text not null,
  tags text[] not null default '{}',
  image jsonb not null default '{}'::jsonb,
  official_url text not null,
  platforms text[] not null default '{}',
  content_types text[] not null default '{}',
  product_links jsonb not null default '[]'::jsonb,
  representative_products text not null default '',
  free_resources text not null default '',
  paid_products text not null default '',
  suitable_for text[] not null default '{}',
  recommended_use_case text not null default '',
  risk_notes text not null default '',
  data_status text not null default '待核验',
  last_verified date,
  sources text[] not null default '{}',
  note text,
  body_markdown text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ips_slug_not_blank check (length(btrim(slug)) > 0),
  constraint ips_name_not_blank check (length(btrim(name)) > 0),
  constraint ips_owner_not_blank check (length(btrim(owner)) > 0),
  constraint ips_type_not_blank check (length(btrim(type)) > 0),
  constraint ips_primary_direction_not_blank check (length(btrim(primary_direction)) > 0),
  constraint ips_official_url_not_blank check (length(btrim(official_url)) > 0),
  constraint ips_image_is_object check (jsonb_typeof(image) = 'object'),
  constraint ips_product_links_is_array check (jsonb_typeof(product_links) = 'array')
);

create index if not exists ips_data_status_idx on public.ips (data_status);
create index if not exists ips_last_verified_idx on public.ips (last_verified);
create index if not exists ips_categories_gin_idx on public.ips using gin (categories);
create index if not exists ips_tags_gin_idx on public.ips using gin (tags);
create index if not exists ips_platforms_gin_idx on public.ips using gin (platforms);
create index if not exists ips_content_types_gin_idx on public.ips using gin (content_types);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ips_updated_at on public.ips;
create trigger set_ips_updated_at
before update on public.ips
for each row
execute function public.set_updated_at();

alter table public.ips enable row level security;

drop policy if exists "Published ips are readable by everyone" on public.ips;
create policy "Published ips are readable by everyone"
on public.ips
for select
to anon, authenticated
using (data_status <> '草稿');

comment on table public.ips is 'Phase 1 IP data migrated from Astro Markdown content collection.';
comment on column public.ips.body_markdown is 'Original Markdown body after frontmatter, rendered by Astro during static build.';
comment on column public.ips.image is 'Original image frontmatter object: { src, alt, source? }.';
comment on column public.ips.product_links is 'Original productLinks frontmatter array.';
