"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { apiUrl } from "@/lib/api";
import { geocodeAddress } from "@/lib/naver-geocoding";

interface MapPlace {
  id: number;
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PlacesResponse {
  status: string;
  data?: MapPlace[];
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

type NaverLatLng = object;

interface NaverMap {
  setCenter: (latLng: NaverLatLng) => void;
  setZoom: (zoom: number) => void;
}

interface NaverMarker {
  setMap: (map: NaverMap | null) => void;
}

interface NaverMapsApi {
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMap;
  Marker: new (options: { position: NaverLatLng; map: NaverMap; title?: string }) => NaverMarker;
}

type NaverWindow = Window & {
  naver?: {
    maps?: NaverMapsApi;
  };
};

const SEOUL_CITY_HALL: UserLocation = {
  latitude: 37.5666805,
  longitude: 126.9784147,
};

function getNaverMaps() {
  return (window as NaverWindow).naver?.maps;
}

function hasCoordinates(place: MapPlace) {
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
}

export default function Map() {
  const { status } = useSession();
  const mapElement = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [resolvedPlaces, setResolvedPlaces] = useState<MapPlace[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // 네이버 지도(Naver Map) 객체 및 마커(Marker) 객체를 리액트 상태 변경과 무관하게 유지하기 위한 레퍼런스(useRef)
  const mapInstanceRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const userMarkerRef = useRef<NaverMarker | null>(null);

  // 1. 현재 사용자 위치 획득 (최초 1회만 구동)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.info("Current location is unavailable:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 5_000,
      },
    );
  }, []);

  // 2. 회원 로그인 성공 시 백엔드 맛집 목록 API 호출
  useEffect(() => {
    if (status !== "authenticated") return;

    fetch(apiUrl("/api/places"))
      .then((response) => response.json())
      .then((data: PlacesResponse) => {
        if (data.status === "success") {
          setPlaces(data.data || []);
        }
      })
      .catch((error) => {
        console.error("Failed to load map places:", error);
      });
  }, [status]);

  // 3. 브라우저 실시간 지오코딩 폴백 및 좌표 복구 루틴
  useEffect(() => {
    let cancelled = false;

    async function resolveAddressOnlyPlaces() {
      const nextPlaces = await Promise.all(
        places.map(async (place) => {
          if (hasCoordinates(place) || !place.address) return place;

          const coordinates = await geocodeAddress(place.address);
          if (!coordinates) {
            console.warn(
              `[Sple Map] "${place.name}" 장소의 좌표 복구 실패 (주소: ${place.address}). ` +
              "위도/경도가 유효하지 않아 지도 마커 렌더링에서 제외됩니다."
            );
            return place;
          }

          return {
            ...place,
            ...coordinates,
          };
        }),
      );

      if (!cancelled) {
        setResolvedPlaces(nextPlaces);
      }
    }

    resolveAddressOnlyPlaces();

    return () => {
      cancelled = true;
    };
  }, [places]);

  // 4. 네이버 지도 객체 최초 1회 초기화 및 생성
  useEffect(() => {
    const maps = getNaverMaps();
    if (!mapElement.current || !maps || mapInstanceRef.current) return;

    const centerLocation = userLocation || SEOUL_CITY_HALL;

    // 지도를 최초 1회만 안전하게 생성하여 mapInstanceRef에 보관
    mapInstanceRef.current = new maps.Map(mapElement.current, {
      center: new maps.LatLng(centerLocation.latitude, centerLocation.longitude),
      zoom: userLocation ? 14 : 15,
      minZoom: 10,
      scaleControl: false,
      mapDataControl: false,
      zoomControl: false,
    });
  }, [userLocation]); // userLocation이 결정되거나 최초 로드 시 지도를 안전하게 한 번만 로드

  // 네이버 지도 SDK 비동기 로딩 확인용 타이머 (Fallback)
  useEffect(() => {
    if (getNaverMaps()) return;

    const timer = window.setInterval(() => {
      if (getNaverMaps() && mapElement.current && !mapInstanceRef.current) {
        window.clearInterval(timer);
        const maps = getNaverMaps();
        if (maps) {
          const centerLocation = userLocation || SEOUL_CITY_HALL;
          mapInstanceRef.current = new maps.Map(mapElement.current!, {
            center: new maps.LatLng(centerLocation.latitude, centerLocation.longitude),
            zoom: userLocation ? 14 : 15,
            minZoom: 10,
            scaleControl: false,
            mapDataControl: false,
            zoomControl: false,
          });
        }
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [userLocation]);

  // 5. 실시간 사용자 위치(`userLocation`) 변경 시 사용자 핀 마커 및 중심좌표 동적 갱신
  useEffect(() => {
    const maps = getNaverMaps();
    const map = mapInstanceRef.current;
    if (!maps || !map || !userLocation) return;

    // 기존 사용자 위치 마커가 존재한다면 제거
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    // 새로운 사용자 위치 마커 동적 생성
    const userMarker = new maps.Marker({
      position: new maps.LatLng(userLocation.latitude, userLocation.longitude),
      map,
      title: "현재 위치",
    });
    userMarkerRef.current = userMarker;

    // 지도의 줌레벨 및 중심좌표를 부드럽게 세팅
    map.setCenter(new maps.LatLng(userLocation.latitude, userLocation.longitude));
    map.setZoom(14);
  }, [userLocation]);

  // 6. 맛집 목록(`resolvedPlaces`) 데이터 및 로그인 상태가 감지되면 마커들을 동적으로 지도에 렌더링
  useEffect(() => {
    const maps = getNaverMaps();
    const map = mapInstanceRef.current;
    if (!maps || !map) return;

    // 기존에 그려져 있던 맛집 마커들을 전부 지도에서 제거하여 리소스를 클리어 (메모리 관리 최적화)
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // 로그인된 유저의 최종 복구 맛집 리스트 필터링
    const visiblePlaces = status === "authenticated" ? resolvedPlaces : [];
    const markerPlaces = visiblePlaces.filter(hasCoordinates);

    // 새로운 맛집 마커 객체들을 지도를 파괴하지 않고 지도 객체 위에 실시간 렌더링
    const newMarkers = markerPlaces.map((place) => {
      const markerPosition = new maps.LatLng(Number(place.latitude), Number(place.longitude));
      return new maps.Marker({
        position: markerPosition,
        map,
        title: place.name,
      });
    });
    markersRef.current = newMarkers;

    // 만약 현재 사용자 GPS 수집에 실패했으나 등록된 맛집이 있으면, 시점을 첫 번째 맛집 중심으로 자동 셋팅
    if (!userLocation && markerPlaces.length > 0) {
      const firstPlace = markerPlaces[0];
      map.setCenter(new maps.LatLng(Number(firstPlace.latitude), Number(firstPlace.longitude)));
      map.setZoom(13);
    }
  }, [resolvedPlaces, status, userLocation]);

  return <div ref={mapElement} className="h-full w-full bg-[#E5E2E1]" />;
}
