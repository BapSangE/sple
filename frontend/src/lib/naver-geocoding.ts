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
    x?: number;
    y?: number;
  };
}

export interface NaverGeocodeResponse {
  result?: {
    items?: NaverGeocodeItem[];
  };
}

export interface NaverGeocoderService {
  Status: {
    OK: string;
  };
  geocode: (
    options: { address: string },
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

export function parseNaverGeocodeCoordinates(
  response: NaverGeocodeResponse,
): PlaceCoordinates | null {
  const point = response.result?.items?.[0]?.point;

  if (typeof point?.y !== "number" || typeof point.x !== "number") {
    return null;
  }

  return {
    latitude: point.y,
    longitude: point.x,
  };
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
  if (!service) return null;

  return new Promise<PlaceCoordinates | null>((resolve) => {
    service.geocode({ address: trimmedAddress }, (status, response) => {
      if (status !== service.Status.OK) {
        resolve(null);
        return;
      }

      resolve(parseNaverGeocodeCoordinates(response));
    });
  });
}
