import assert from "node:assert/strict";
import { test } from "node:test";
import { applySaveResults, readDraft, type SaveCandidate } from "../src/lib/place-draft.ts";

const candidates: SaveCandidate[] = ["카페", "식당"].map(name => ({
  name, selected: true, saved: false, request_id: crypto.randomUUID(),
}));

test("partial success leaves only failed candidates selected with the same retry ID", () => {
  const result = applySaveResults(candidates, new Set([candidates[0].request_id]));
  assert.equal(result[0].saved, true);
  assert.equal(result[0].selected, false);
  assert.equal(result[1].selected, true);
  assert.equal(result[1].request_id, candidates[1].request_id);
});

test("draft survives login navigation with selections and retry IDs", () => {
  const draft = { text: "맛집 소개", places: candidates, userId: null, updatedAt: Date.now() };
  assert.deepEqual(JSON.parse(JSON.stringify(readDraft(JSON.stringify(draft)))), draft);
});

test("expired, corrupt or wrongly typed drafts are discarded", () => {
  assert.equal(readDraft("{"), null);
  assert.equal(readDraft(JSON.stringify({ text: "x", places: candidates, userId: null, updatedAt: 1 })), null);
  assert.equal(readDraft(JSON.stringify({ text: "x", places: [{ ...candidates[0], name: 42 }], userId: null, updatedAt: Date.now() })), null);
});
