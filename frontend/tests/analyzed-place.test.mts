import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeAnalyzedPlace } from "../src/lib/analyzed-place.ts";

test("normalizeAnalyzedPlace keeps AI category and summary", () => {
  assert.deepEqual(
    normalizeAnalyzedPlace({
      name: " 덮밥장사장 ",
      address: " 서울 강남구 ",
      category: "Dining",
      summary: "불맛이 강한 덮밥과 넉넉한 토핑이 특징",
    }),
    {
      name: "덮밥장사장",
      address: "서울 강남구",
      category: "Dining",
      summary: "불맛이 강한 덮밥과 넉넉한 토핑이 특징",
      selected: true,
    },
  );
});

test("normalizeAnalyzedPlace rejects missing names", () => {
  assert.equal(normalizeAnalyzedPlace({ address: "서울" }), null);
});
