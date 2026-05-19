-- Allow saving place candidates when copied text includes a store name but no
-- exact address. This matches common Instagram caption content.

begin;

alter table public.places
  add column if not exists address text;

update public.places
set address = ''
where address is null;

alter table public.places
  alter column address type text,
  alter column address set default '',
  alter column address drop not null;

commit;
