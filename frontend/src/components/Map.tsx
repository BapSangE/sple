"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { apiUrl } from "@/lib/api";

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

  useEffect(() => {
    if (status !== "authenticated") {
      return;
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
    const initMap = () => {
      const maps = getNaverMaps();
      if (!mapElement.current || !maps) return;

      const defaultLocation = new maps.LatLng(37.5666805, 126.9784147);
      const map = new maps.Map(mapElement.current, {
        center: defaultLocation,
        zoom: 15,
        minZoom: 10,
        scaleControl: false,
        mapDataControl: false,
        zoomControl: false,
      });

      const visiblePlaces = status === "authenticated" ? places : [];
      const markerPlaces = visiblePlaces.filter(hasCoordinates);

      markerPlaces.forEach((place) => {
        const markerPosition = new maps.LatLng(place.latitude as number, place.longitude as number);
        new maps.Marker({
          position: markerPosition,
          map,
          title: place.name,
        });
      });

      const firstPlace = markerPlaces[0];
      if (firstPlace) {
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
  }, [places, status]);

  return <div ref={mapElement} className="h-full w-full bg-[#E5E2E1]" />;
}
