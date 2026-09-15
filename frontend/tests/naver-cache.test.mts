import assert from "node:assert/strict";
import { test } from "node:test";
import { hasFreshNaverMetadata } from "../src/lib/naver-cache.ts";

test("temporary errors and expired metadata can be retried", () => {
  const now = Date.now();
  const timestamp = new Date(now - 3_600_000).toISOString();
  assert.equal(hasFreshNaverMetadata({ naver_match_status: "not_found", naver_enriched_at: timestamp }, now), false);
  assert.equal(hasFreshNaverMetadata({ naver_match_status: "matched", naver_enriched_at: timestamp }, now), true);
  assert.equal(hasFreshNaverMetadata({ naver_match_status: "api_error", naver_enriched_at: new Date(now).toISOString() }, now), false);
});
