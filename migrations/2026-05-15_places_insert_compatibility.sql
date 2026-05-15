-- Supabase follow-up migration for legacy places tables.
--
-- Run this after 2026-05-15_places_user_id_text.sql if saving a place still
-- fails. Older schemas may have been created before the current backend
-- contract and can be missing insert defaults or have stale NOT NULL columns.

begin;

create table if not exists public.places (
  id bigserial primary key,
  user_id text not null,
  name text not null,
  address text not null,
  category text default 'All',
  rating double precision,
  summary text
);

alter table public.places
  drop constraint if exists places_user_id_fkey;

alter table public.places
  add column if not exists user_id text,
  add column if not exists name text,
  add column if not exists address text,
  add column if not exists category text default 'All',
  add column if not exists rating double precision,
  add column if not exists summary text;

create table if not exists public.places_orphaned_20260515 as
select *
from public.places
where user_id is null;

delete from public.places
where user_id is null;

alter table public.places
  alter column user_id type text using user_id::text,
  alter column name type text,
  alter column address type text,
  alter column category type text,
  alter column rating type double precision using rating::double precision,
  alter column summary type text;

alter table public.places
  alter column user_id set not null,
  alter column name set not null,
  alter column address set not null,
  alter column category set default 'All';

create sequence if not exists public.places_id_seq;

select setval(
  'public.places_id_seq',
  greatest(coalesce((select max(id) from public.places), 0) + 1, 1),
  false
);

alter sequence public.places_id_seq owned by public.places.id;

alter table public.places
  alter column id set default nextval('public.places_id_seq'::regclass),
  alter column id set not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places' and column_name = 'user_email'
  ) then
    alter table public.places alter column user_email drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places' and column_name = 'memo'
  ) then
    alter table public.places alter column memo drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places' and column_name = 'folder'
  ) then
    alter table public.places alter column folder drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places' and column_name = 'image_url'
  ) then
    alter table public.places alter column image_url drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places' and column_name = 'detailed_highlights'
  ) then
    alter table public.places alter column detailed_highlights drop not null;
  end if;
end $$;

create index if not exists ix_places_user_id on public.places (user_id);
create index if not exists ix_places_user_id_id_desc on public.places (user_id, id desc);

commit;
