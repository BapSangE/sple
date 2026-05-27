import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPlaceMarkerHtml,
  createUserLocationMarkerHtml,
} from "../src/lib/map-marker-styles.ts";

test("createUserLocationMarkerHtml returns a distinct current location marker", () => {
  const html = createUserLocationMarkerHtml();

  assert.match(html, /sple-user-location-marker/);
  assert.match(html, /sple-user-location-marker__pulse/);
  assert.doesNotMatch(html, /sple-place-marker/);
});

test("createPlaceMarkerHtml returns a place pin marker", () => {
  const html = createPlaceMarkerHtml();

  assert.match(html, /sple-place-marker/);
  assert.match(html, /sple-place-marker__pin/);
  assert.doesNotMatch(html, /sple-user-location-marker/);
});

test("createPlaceMarkerHtml marks selected places", () => {
  const html = createPlaceMarkerHtml({ selected: true });

  assert.match(html, /sple-place-marker--selected/);
});
