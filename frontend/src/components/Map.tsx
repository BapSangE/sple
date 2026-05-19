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

interface NaverMapsApi {
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMap;
  Marker: new (options: { position: NaverLatLng; map: NaverMap; title?: string }) => unknown;
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
  return typeof place.latitude === "number" && typeof place.longitude === "number";
}

export default function Map() {
  const { status } = useSession();
  const mapElement = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [resolvedPlaces, setResolvedPlaces] = useState<MapPlace[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    async function resolveAddressOnlyPlaces() {
      const nextPlaces = await Promise.all(
        places.map(async (place) => {
          if (hasCoordinates(place) || !place.address) return place;

          const coordinates = await geocodeAddress(place.address);
          if (!coordinates) return place;

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
    const initMap = () => {
      const maps = getNaverMaps();
      if (!mapElement.current || !maps) return;

      const visiblePlaces = status === "authenticated" ? resolvedPlaces : [];
      const markerPlaces = visiblePlaces.filter(hasCoordinates);
      const centerLocation = userLocation || SEOUL_CITY_HALL;

      const map = new maps.Map(mapElement.current, {
        center: new maps.LatLng(centerLocation.latitude, centerLocation.longitude),
        zoom: userLocation ? 14 : 15,
        minZoom: 10,
        scaleControl: false,
        mapDataControl: false,
        zoomControl: false,
      });

      if (userLocation) {
        new maps.Marker({
          position: new maps.LatLng(userLocation.latitude, userLocation.longitude),
          map,
          title: "현재 위치",
        });
      }

      markerPlaces.forEach((place) => {
        const markerPosition = new maps.LatLng(place.latitude as number, place.longitude as number);
        new maps.Marker({
          position: markerPosition,
          map,
          title: place.name,
        });
      });

      if (!userLocation && markerPlaces.length > 0) {
        const firstPlace = markerPlaces[0];
        map.setCenter(new maps.LatLng(firstPlace.latitude as number, firstPlace.longitude as number));
        map.setZoom(13);
      }
    };

    if (getNaverMaps()) {
      initMap();
      return;
    }

    const timer = window.setInterval(() => {
      if (getNaverMaps()) {
        window.clearInterval(timer);
        initMap();
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [resolvedPlaces, status, userLocation]);

  return <div ref={mapElement} className="h-full w-full bg-[#E5E2E1]" />;
}
