"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import PlaceDetailSheet, { type DetailPlace } from "@/components/PlaceDetailSheet";
import { apiUrl } from "@/lib/api";
import { geocodeAddress } from "@/lib/naver-geocoding";
import {
  createPlaceMarkerHtml,
  createUserLocationMarkerHtml,
} from "@/lib/map-marker-styles";

interface MapPlace extends DetailPlace {
  latitude?: number | null;
  longitude?: number | null;
  geocoding_status?: string | null;
}

interface PlacesResponse {
  status: string;
  data?: MapPlace[];
  message?: string;
}

interface PlaceEnrichResponse {
  status: string;
  data?: MapPlace;
  message?: string;
  detail?: string | { message?: string };
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

type NaverLatLng = object;
type NaverPoint = object;

interface NaverMap {
  setCenter: (latLng: NaverLatLng) => void;
  setZoom: (zoom: number) => void;
}

interface NaverMarker {
  setMap: (map: NaverMap | null) => void;
}

interface NaverMapsApi {
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Point: new (x: number, y: number) => NaverPoint;
  Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMap;
  Marker: new (options: {
    position: NaverLatLng;
    map: NaverMap;
    title?: string;
    icon?: {
      content: string;
      anchor?: NaverPoint;
    };
    zIndex?: number;
  }) => NaverMarker;
  Event?: {
    addListener: (target: unknown, eventName: string, listener: () => void) => unknown;
    removeListener: (listener: unknown) => void;
  };
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
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

function getErrorMessage(payload: PlaceEnrichResponse | null) {
  if (!payload) return "네이버 장소 정보를 불러오지 못했습니다.";
  if (typeof payload.detail === "string") return payload.detail;
  if (payload.detail?.message) return payload.detail.message;
  return payload.message || "네이버 장소 정보를 불러오지 못했습니다.";
}

function hasCacheableNaverStatus(place: MapPlace) {
  return (
    Boolean(place.naver_enriched_at) &&
    ["matched", "low_confidence", "not_found"].includes(place.naver_match_status || "")
  );
}

export default function Map() {
  const { status } = useSession();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const markerListenersRef = useRef<unknown[]>([]);
  const userMarkerRef = useRef<NaverMarker | null>(null);

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [resolvedPlaces, setResolvedPlaces] = useState<MapPlace[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isLoadingNaver, setIsLoadingNaver] = useState(false);
  const [naverError, setNaverError] = useState<string | null>(null);

  const enrichPlace = useCallback(async (place: MapPlace) => {
    if (hasCacheableNaverStatus(place)) return;

    setIsLoadingNaver(true);
    setNaverError(null);

    try {
      const response = await fetch(apiUrl("/api/places/enrich"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: place.id }),
      });
      const payload = (await response.json().catch(() => null)) as PlaceEnrichResponse | null;

      if (!response.ok || payload?.status !== "success" || !payload.data) {
        throw new Error(getErrorMessage(payload));
      }

      const enrichedPlace = payload.data;
      setPlaces((current) =>
        current.map((item) => (item.id === enrichedPlace.id ? { ...item, ...enrichedPlace } : item)),
      );
      setResolvedPlaces((current) =>
        current.map((item) => (item.id === enrichedPlace.id ? { ...item, ...enrichedPlace } : item)),
      );
      setSelectedPlace((current) =>
        current?.id === enrichedPlace.id ? { ...current, ...enrichedPlace } : current,
      );
    } catch (error) {
      setNaverError(
        error instanceof Error ? error.message : "네이버 장소 정보를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoadingNaver(false);
    }
  }, []);

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

  useEffect(() => {
    if (status !== "authenticated") {
      const timer = window.setTimeout(() => {
        setPlaces([]);
        setResolvedPlaces([]);
      }, 0);
      return () => window.clearTimeout(timer);
    }

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

  useEffect(() => {
    let cancelled = false;

    async function resolveAddressOnlyPlaces() {
      const nextPlaces = await Promise.all(
        places.map(async (place) => {
          if (hasCoordinates(place) || !place.address) return place;

          const coordinates = await geocodeAddress(place.address);
          if (!coordinates) {
            console.warn(
              `[Sple Map] "${place.name}" address could not be converted to coordinates.`,
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

  useEffect(() => {
    const maps = getNaverMaps();
    if (!mapElement.current || !maps || mapInstanceRef.current) return;

    const centerLocation = userLocation || SEOUL_CITY_HALL;
    mapInstanceRef.current = new maps.Map(mapElement.current, {
      center: new maps.LatLng(centerLocation.latitude, centerLocation.longitude),
      zoom: userLocation ? 14 : 15,
      minZoom: 10,
      scaleControl: false,
      mapDataControl: false,
      zoomControl: false,
    });
  }, [userLocation]);

  useEffect(() => {
    if (getNaverMaps()) return;

    const timer = window.setInterval(() => {
      const maps = getNaverMaps();
      if (maps && mapElement.current && !mapInstanceRef.current) {
        window.clearInterval(timer);
        const centerLocation = userLocation || SEOUL_CITY_HALL;
        mapInstanceRef.current = new maps.Map(mapElement.current, {
          center: new maps.LatLng(centerLocation.latitude, centerLocation.longitude),
          zoom: userLocation ? 14 : 15,
          minZoom: 10,
          scaleControl: false,
          mapDataControl: false,
          zoomControl: false,
        });
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [userLocation]);

  useEffect(() => {
    const maps = getNaverMaps();
    const map = mapInstanceRef.current;
    if (!maps || !map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    userMarkerRef.current = new maps.Marker({
      position: new maps.LatLng(userLocation.latitude, userLocation.longitude),
      map,
      title: "현재 위치",
      icon: {
        content: createUserLocationMarkerHtml(),
        anchor: new maps.Point(14, 14),
      },
      zIndex: 100,
    });

    map.setCenter(new maps.LatLng(userLocation.latitude, userLocation.longitude));
    map.setZoom(14);
  }, [userLocation]);

  useEffect(() => {
    const maps = getNaverMaps();
    const map = mapInstanceRef.current;
    if (!maps || !map) return;

    markerListenersRef.current.forEach((listener) => {
      maps.Event?.removeListener(listener);
    });
    markerListenersRef.current = [];

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const visiblePlaces = status === "authenticated" ? resolvedPlaces : [];
    const markerPlaces = visiblePlaces.filter(hasCoordinates);

    markersRef.current = markerPlaces.map((place) => {
      const markerPosition = new maps.LatLng(Number(place.latitude), Number(place.longitude));
      const marker = new maps.Marker({
        position: markerPosition,
        map,
        title: place.name,
        icon: {
          content: createPlaceMarkerHtml({ selected: selectedPlace?.id === place.id }),
          anchor: new maps.Point(17, 42),
        },
        zIndex: selectedPlace?.id === place.id ? 120 : 80,
      });

      const listener = maps.Event?.addListener(marker, "click", () => {
        setSelectedPlace(place);
        void enrichPlace(place);
      });
      if (listener) markerListenersRef.current.push(listener);

      return marker;
    });

    if (!userLocation && markerPlaces.length > 0) {
      const firstPlace = markerPlaces[0];
      map.setCenter(new maps.LatLng(Number(firstPlace.latitude), Number(firstPlace.longitude)));
      map.setZoom(13);
    }
  }, [enrichPlace, resolvedPlaces, selectedPlace?.id, status, userLocation]);

  return (
    <>
      <div ref={mapElement} className="h-full w-full bg-[#E5E2E1]" />
      <PlaceDetailSheet
        place={selectedPlace}
        isLoadingNaver={isLoadingNaver}
        naverError={naverError}
        onClose={() => {
          setSelectedPlace(null);
          setNaverError(null);
        }}
      />
    </>
  );
}
