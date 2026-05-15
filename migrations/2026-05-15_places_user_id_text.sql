-- Supabase production migration for NextAuth Google subject ids.
-- Run this in the Supabase SQL editor before relying on saved places.

create table if not exists places (
  id bigserial primary key,
  user_id text not null,
  name text not null,
  address text not null,
  category text default 'All',
  rating double precision,
  summary text
);

alter table places
  alter column user_id type text using user_id::text,
  alter column name type text,
  alter column address type text,
  alter column category type text,
  alter column category set default 'All';

alter table places
  alter column user_id set not null,
  alter column name set not null,
  alter column address set not null;

create index if not exists ix_places_user_id on places (user_id);
create index if not exists ix_places_user_id_id_desc on places (user_id, id desc);
