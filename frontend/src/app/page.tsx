"use client";

import Map from "@/components/Map";
import { Navigation, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="relative w-full h-full">
      {/* 네이버 맵 컴포넌트 */}
      <Map />

      {/* 우측 하단 맵 컨트롤 버튼들 */}
      <div className="absolute right-4 bottom-[100px] flex flex-col gap-3 z-10">
        <button className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-[0px_4px_12px_rgba(0,0,0,0.1)] active:scale-95 transition-transform">
          <Layers size={22} className="text-gray-700" />
        </button>
        <button className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-[0px_4px_12px_rgba(0,0,0,0.1)] active:scale-95 transition-transform text-[#006C50]">
          <Navigation size={22} />
        </button>
      </div>
    </div>
  );
}
