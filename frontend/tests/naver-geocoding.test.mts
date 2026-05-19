import assert from "node:assert/strict";
import { test } from "node:test";

import {
  geocodingFieldsFromCoordinates,
  parseNaverGeocodeCoordinates,
} from "../src/lib/naver-geocoding.js";

test("parseNaverGeocodeCoordinates returns latitude and longitude from the first geocode item", () => {
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
