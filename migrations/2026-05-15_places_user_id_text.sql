-- Supabase production migration for NextAuth Google subject ids.
-- Run this in the Supabase SQL editor before relying on saved places.
--
-- Why this exists:
-- Older Sple schemas may have places.user_id as an integer foreign key to users.id.
-- The current production app identifies users with the NextAuth/Google subject id,
-- which is a string. This migration removes the old integer FK and converts
-- places.user_id to text so saved places can be queried by the current session id.

alter table if exists places
  drop constraint if exists places_user_id_fkey;

create table if not exists places (
  id bigserial primary key,
  user_id text not null,
  name text not null,
  address text not null,
  category text default 'All',
  rating double precision,
  summary text
);

-- Preserve legacy rows that have no owner before enforcing NOT NULL.
create table if not exists places_orphaned_20260515 as
select *
from places
where user_id is null;

delete from places
where user_id is null;

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
