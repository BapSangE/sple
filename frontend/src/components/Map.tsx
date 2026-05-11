"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    naver: any;
  }
}

export default function Map() {
  const mapElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 네이버 지도 스크립트가 로드되었는지 확인
    const initMap = () => {
      if (!mapElement.current || !window.naver || !window.naver.maps) return;

      // 서울시청 중심 좌표
      const location = new window.naver.maps.LatLng(37.5666805, 126.9784147);
      
      const mapOptions = {
        center: location,
        zoom: 15,
        minZoom: 10,
        scaleControl: false,
        mapDataControl: false,
        zoomControl: false, // 커스텀 버튼을 위해 기본 숨김
      };

      const map = new window.naver.maps.Map(mapElement.current, mapOptions);

      // 추후 내 위치 이동 등의 로직을 위해 map 객체를 상태로 관리할 수 있습니다.
    };

    // 스크립트가 아직 로드되지 않은 경우를 대비한 인터벌 처리
    if (window.naver && window.naver.maps) {
      initMap();
    } else {
      const timer = setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(timer);
          initMap();
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, []);

  return <div ref={mapElement} className="w-full h-full bg-[#E5E2E1]" />;
}
