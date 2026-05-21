export interface PlaceCoordinates {
  latitude: number;
  longitude: number;
}

export interface PlaceGeocodingFields {
  latitude: number | null;
  longitude: number | null;
  geocoding_status: "pending" | "resolved" | "failed";
}

export interface NaverGeocodeItem {
  point?: {
    x?: number | string;
    y?: number | string;
  };
}

export interface NaverGeocodeAddressV2 {
  x?: number | string;
  y?: number | string;
}

export interface NaverGeocodeResponse {
  v2?: {
    addresses?: NaverGeocodeAddressV2[];
  };
  result?: {
    items?: NaverGeocodeItem[];
  };
}

export interface NaverGeocoderService {
  Status: {
    OK: string;
  };
  geocode: (
    options: { query: string },
    callback: (status: string, response: NaverGeocodeResponse) => void,
  ) => void;
}

type NaverGeocoderWindow = Window & {
  naver?: {
    maps?: {
      Service?: NaverGeocoderService;
    };
  };
};

function toCoordinate(value: number | string | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function createNaverGeocodeOptions(address: string) {
  return {
    query: address.trim(),
  };
}

export function parseNaverGeocodeCoordinates(
  response: NaverGeocodeResponse,
): PlaceCoordinates | null {
  const v2Address = response.v2?.addresses?.[0];
  const v2Longitude = toCoordinate(v2Address?.x);
  const v2Latitude = toCoordinate(v2Address?.y);

  if (v2Latitude !== null && v2Longitude !== null) {
    return {
      latitude: v2Latitude,
      longitude: v2Longitude,
    };
  }

  const legacyPoint = response.result?.items?.[0]?.point;
  const legacyLongitude = toCoordinate(legacyPoint?.x);
  const legacyLatitude = toCoordinate(legacyPoint?.y);

  if (legacyLatitude !== null && legacyLongitude !== null) {
    return {
      latitude: legacyLatitude,
      longitude: legacyLongitude,
    };
  }

  return null;
}

export function geocodingFieldsFromCoordinates(
  coordinates: PlaceCoordinates | null,
): PlaceGeocodingFields {
  if (!coordinates) {
    return {
      latitude: null,
      longitude: null,
      geocoding_status: "failed",
    };
  }

  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    geocoding_status: "resolved",
  };
}

export function pendingGeocodingFields(): PlaceGeocodingFields {
  return {
    latitude: null,
    longitude: null,
    geocoding_status: "pending",
  };
}

function getNaverGeocoderService() {
  if (typeof window === "undefined") return null;
  return (window as NaverGeocoderWindow).naver?.maps?.Service || null;
}

function waitForNaverGeocoder(timeoutMs = 2500) {
  return new Promise<NaverGeocoderService | null>((resolve) => {
    const service = getNaverGeocoderService();
    if (service) {
      resolve(service);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const nextService = getNaverGeocoderService();
      if (nextService) {
        window.clearInterval(timer);
        resolve(nextService);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });
}

export async function geocodeAddress(address: string) {
  const trimmedAddress = address.trim();
  if (!trimmedAddress || typeof window === "undefined") return null;

  const service = await waitForNaverGeocoder();
  if (!service) {
    console.error(
      "[Sple Naver Geocoder] Geocoder service was not loaded. Check NEXT_PUBLIC_NAVER_CLIENT_ID, allowed domains, and the geocoder submodule.",
    );
    return null;
  }

  return new Promise<PlaceCoordinates | null>((resolve) => {
    service.geocode(createNaverGeocodeOptions(trimmedAddress), (status, response) => {
      if (status !== service.Status.OK) {
        console.warn(
          `[Sple Naver Geocoder] Geocoding failed. address="${trimmedAddress}", status="${status}"`,
        );
        resolve(null);
        return;
      }

      const coordinates = parseNaverGeocodeCoordinates(response);
      if (!coordinates) {
        console.warn(
          `[Sple Naver Geocoder] Geocoding response did not include coordinates. address="${trimmedAddress}"`,
          response,
        );
      }
      resolve(coordinates);
    });
  });
}
