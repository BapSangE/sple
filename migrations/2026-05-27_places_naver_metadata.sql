alter table places
  add column if not exists naver_place_title text,
  add column if not exists naver_place_url text,
  add column if not exists naver_category text,
  add column if not exists naver_description text,
  add column if not exists naver_telephone text,
  add column if not exists naver_address text,
  add column if not exists naver_road_address text,
  add column if not exists naver_mapx text,
  add column if not exists naver_mapy text,
  add column if not exists naver_match_status text,
  add column if not exists naver_enriched_at timestamptz;

create index if not exists idx_places_user_naver_enriched_at
  on places(user_id, naver_enriched_at);
