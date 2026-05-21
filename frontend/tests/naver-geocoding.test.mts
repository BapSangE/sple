import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createNaverGeocodeOptions,
  geocodingFieldsFromCoordinates,
  parseNaverGeocodeCoordinates,
} from "../src/lib/naver-geocoding.js";

test("createNaverGeocodeOptions uses NCP geocoder query parameter", () => {
  assert.deepEqual(createNaverGeocodeOptions("  서울 성동구 아차산로9길 8  "), {
    query: "서울 성동구 아차산로9길 8",
  });
});

test("parseNaverGeocodeCoordinates returns coordinates from NCP v2 addresses", () => {
  const coordinates = parseNaverGeocodeCoordinates({
    v2: {
      addresses: [
        {
          x: "126.9784147",
          y: "37.5666805",
        },
      ],
    },
  });

  assert.deepEqual(coordinates, {
    latitude: 37.5666805,
    longitude: 126.9784147,
  });
});

test("parseNaverGeocodeCoordinates also supports legacy result item responses", () => {
  const coordinates = parseNaverGeocodeCoordinates({
    result: {
      items: [
        {
          point: {
            x: 126.9784147,
            y: 37.5666805,
          },
        },
      ],
    },
  });

  assert.deepEqual(coordinates, {
    latitude: 37.5666805,
    longitude: 126.9784147,
  });
});

test("geocodingFieldsFromCoordinates marks missing coordinates as failed", () => {
  assert.deepEqual(geocodingFieldsFromCoordinates(null), {
    latitude: null,
    longitude: null,
    geocoding_status: "failed",
  });
});
