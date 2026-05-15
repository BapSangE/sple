"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface SavedPlace {
  id: number;
  name: string;
  address: string;
  category: string;
  rating: number;
  summary: string;
}

interface PlacesResponse {
  status: string;
  data?: SavedPlace[];
  message?: string;
}

const CATEGORIES = ['All', 'Cafe', 'Dining', 'Bar'];

export default function SavedPage() {
  const { data: session, status } = useSession();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<SavedPlace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    if (status === "loading") return;

    const userId = session?.user
      ? (session.user as typeof session.user & { id?: string }).id
      : undefined;

    if (userId) {
      fetch(apiUrl("/api/places"))
        .then((res) => res.json())
        .then((data) => {
          const placesResponse = data as PlacesResponse;
          if (placesResponse.status === "success") {
            setLoadError(null);
            setPlaces(placesResponse.data || []);
          } else {
            setLoadError(placesResponse.message || "저장된 장소를 불러오지 못했습니다.");
          }
        })
        .catch((error) => {
          console.error("Failed to fetch places:", error);
          setLoadError("저장된 장소를 불러오지 못했습니다.");
        })
        .finally(() => setIsLoading(false));
    } else {
      Promise.resolve().then(() => {
        setPlaces([]);
        setLoadError(null);
        setIsLoading(false);
      });
    }
  }, [session, status]);

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchesCategory = selectedCategory === "All" || place.category === selectedCategory;
      const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            place.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [places, searchQuery, selectedCategory]);

  const handleNaverMap = (place: SavedPlace) => {
    const query = encodeURIComponent(`${place.address} ${place.name}`);
    window.open(`https://m.map.naver.com/search2/search.naver?query=${query}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-background pt-[72px] pb-[80px] px-6">
      <div className="mt-6 mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">저장된 장소</h1>
        <p className="text-sm text-text-secondary">당신만의 취향이 담긴 컬렉션</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="장소 검색..." 
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6">
        {CATEGORIES.map((cat) => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap active:scale-95 transition-all ${
              selectedCategory === cat 
                ? "bg-primary text-white border-primary shadow-sm" 
                : "bg-white border-gray-200 text-text-secondary hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-4 pb-6">
        {status === "unauthenticated" ? (
           <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-center">
             <span className="material-symbols-outlined text-4xl mb-2">lock</span>
             <p>로그인 후 장소를 저장하고 확인할 수 있습니다.</p>
           </div>
        ) : isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-10 text-red-500 text-center">
            <span className="material-symbols-outlined text-4xl mb-2">error</span>
            <p>{loadError}</p>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
            <p>저장된 장소가 없거나 검색 결과가 없습니다.</p>
          </div>
        ) : (
          filteredPlaces.map((place) => (
            <div 
              key={place.id} 
              onClick={() => setSelectedPlace(place)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-text-primary">{place.name}</h3>
                {place.rating && (
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    <span className="material-symbols-outlined fill text-[12px]">star</span>
                    {place.rating}
                  </div>
                )}
              </div>
              <p className="text-text-secondary text-sm flex items-center gap-1">
                <MapPin size={14} /> {place.address}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 상세 바텀 시트 */}
      <AnimatePresence>
        {selectedPlace && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlace(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] px-6 pt-4 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">{selectedPlace.name}</h2>
                  <p className="text-text-secondary text-sm flex items-center gap-1">
                    <MapPin size={14} /> {selectedPlace.address}
                  </p>
                </div>
                <button onClick={() => setSelectedPlace(null)} className="p-2 bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {selectedPlace.summary && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined fill text-primary">psychiatry</span>
                    <span className="font-bold text-primary text-sm">AI 요약</span>
                  </div>
                  <p className="text-text-primary text-sm leading-relaxed">
                    {selectedPlace.summary}
                  </p>
                </div>
              )}

              <button 
                onClick={() => handleNaverMap(selectedPlace)}
                className="w-full h-[52px] flex items-center justify-center gap-2 bg-[#03C75A] text-white rounded-xl font-bold text-base shadow-[0_8px_16px_rgba(3,199,90,0.2)] active:scale-[0.98] transition-all"
              >
                네이버 지도로 확인하기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
