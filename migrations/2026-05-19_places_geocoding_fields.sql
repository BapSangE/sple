begin;

alter table public.places
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoding_status text default 'pending';

update public.places
set geocoding_status = case
  when latitude is not null and longitude is not null then 'resolved'
  when address is null or trim(address) = '' then 'pending'
  else coalesce(geocoding_status, 'pending')
end
where geocoding_status is null;

create index if not exists ix_places_user_id_geocoding_status
  on public.places (user_id, geocoding_status);

commit;
