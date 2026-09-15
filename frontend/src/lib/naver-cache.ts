export function hasFreshNaverMetadata(place: {
  naver_enriched_at?: string | null;
  naver_match_status?: string | null;
}, now = Date.now()) {
  if (!place.naver_enriched_at || !["matched", "low_confidence", "not_found"].includes(place.naver_match_status || "")) return false;
  const age = now - Date.parse(place.naver_enriched_at);
  const ttl = place.naver_match_status === "matched" ? 7 * 86_400_000 : 3_600_000;
  return age >= 0 && age < ttl;
}
