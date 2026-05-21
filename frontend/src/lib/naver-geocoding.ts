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
  if (!service) {
    console.error(
      "[Sple Naver Geocoder API] 네이버 지도 Geocoder 서비스를 불러오지 못했습니다.\n" +
      "1. layout.tsx에 네이버 지도 스크립트 로드 시 '&submodules=geocoder' 옵션이 제대로 붙어 있는지 확인해 주세요.\n" +
      "2. 환경 변수 NEXT_PUBLIC_NAVER_CLIENT_ID가 정확하게 정의되어 있는지 확인해 주세요.\n" +
      "3. 네이버 클라우드 플랫폼(NCP) 콘솔에 현재 접속 중인 도메인(Web 서비스 URL)이 정확히 등록되어 있는지 확인해 주세요."
    );
    return null;
  }

  return new Promise<PlaceCoordinates | null>((resolve) => {
    service.geocode({ address: trimmedAddress }, (status, response) => {
      if (status !== service.Status.OK) {
        console.warn(
          `[Sple Naver Geocoder API] 주소 지오코딩 실패 (주소: "${trimmedAddress}", 응답 상태: "${status}").\n` +
          "네이버 클라우드 플랫폼 콘솔의 AI·NAVER API -> Application 설정에서 'Geocoding' 서비스 사용 권한이 활성화되어 있는지 확인해 주세요."
        );
        resolve(null);
        return;
      }

      const coordinates = parseNaverGeocodeCoordinates(response);
      if (!coordinates) {
        console.warn(`[Sple Naver Geocoder API] 주소 매칭 좌표 없음: "${trimmedAddress}"`);
      }
      resolve(coordinates);
    });
  });
}
