"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, Trash2 } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { geocodeAddress, geocodingFieldsFromCoordinates } from "@/lib/naver-geocoding";

interface SavedPlace {
  id: number;
  name: string;
  address?: string;
  category: string;
  rating: number;
  summary: string;
  latitude?: number | null;
  longitude?: number | null;
  geocoding_status?: string;
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
  const [addressDraft, setAddressDraft] = useState("");
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

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
                            (place.address || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [places, searchQuery, selectedCategory]);

  const handleNaverMap = (place: SavedPlace) => {
    if (!place.address) return;
    const query = encodeURIComponent(`${place.address} ${place.name}`);
    window.open(`https://m.map.naver.com/search2/search.naver?query=${query}`, "_blank");
  };

  const handleFindBranch = (place: SavedPlace) => {
    const query = encodeURIComponent(place.name);
    window.open(`https://m.map.naver.com/search2/search.naver?query=${query}`, "_blank");
  };

  const openPlaceDetail = (place: SavedPlace) => {
    setSelectedPlace(place);
    setAddressDraft(place.address || "");
    setUpdateError(null);
  };

  const closePlaceDetail = () => {
    setSelectedPlace(null);
    setAddressDraft("");
    setUpdateError(null);
  };

  const handleUpdateAddress = async () => {
    if (!selectedPlace) return;

    const nextAddress = addressDraft.trim();
    if (!nextAddress) {
      setUpdateError("주소를 입력해주세요.");
      return;
    }

    setIsUpdatingAddress(true);
    setUpdateError(null);

    try {
      const coordinates = await geocodeAddress(nextAddress);
      const geocodingFields = geocodingFieldsFromCoordinates(coordinates);
      const response = await fetch(apiUrl("/api/places"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPlace.id,
          name: selectedPlace.name,
          address: nextAddress,
          category: selectedPlace.category,
          rating: selectedPlace.rating,
          summary: selectedPlace.summary,
          ...geocodingFields,
        }),
      });

      const data = (await response.json()) as PlacesResponse & { data?: SavedPlace };

      if (!response.ok || data.status !== "success" || !data.data) {
        throw new Error(data.message || "주소를 저장하지 못했습니다.");
      }

      setPlaces((currentPlaces) =>
        currentPlaces.map((place) => (place.id === data.data?.id ? data.data : place)),
      );
      setSelectedPlace(data.data);
      setAddressDraft(data.data.address || "");
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "주소를 저장하지 못했습니다.");
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  const handleDeletePlace = async () => {
    if (!selectedPlace) return;

    const isConfirmed = window.confirm("정말 이 장소를 삭제하시겠습니까?");
    if (!isConfirmed) return;

    try {
      const response = await fetch(apiUrl(`/api/places?id=${selectedPlace.id}`), {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "장소를 삭제하지 못했습니다.");
      }

      // 상태 동기화: 삭제된 장소 제외
      setPlaces((currentPlaces) =>
        currentPlaces.filter((place) => place.id !== selectedPlace.id),
      );
      closePlaceDetail();
    } catch (error) {
      alert(error instanceof Error ? error.message : "장소 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-6 pt-[72px] pb-[calc(96px+env(safe-area-inset-bottom))]">
      <div className="mt-6 mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-text-primary mb-2">저장된 장소</h1>
        <p className="text-sm text-text-secondary">당신만의 취향이 담긴 컬렉션</p>
      </div>

      <div className="relative mb-6 shrink-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="장소 검색..." 
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      <div className="mb-6 flex shrink-0 gap-2 overflow-x-auto hide-scrollbar">
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-32 hide-scrollbar [-webkit-overflow-scrolling:touch]">
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
              onClick={() => openPlaceDetail(place)}
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
                <MapPin size={14} /> {place.address || "주소 정보 없음"}
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
              onClick={closePlaceDetail}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 z-[70] max-h-[calc(100%-88px)] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-6 pt-4 pb-[calc(112px+env(safe-area-inset-bottom))] shadow-2xl [-webkit-overflow-scrolling:touch]"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">{selectedPlace.name}</h2>
                  <p className="text-text-secondary text-sm flex items-center gap-1">
                    <MapPin size={14} /> {selectedPlace.address || "주소 정보 없음"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeletePlace}
                    className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-full active:scale-95 transition-all"
                    title="장소 삭제"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button onClick={closePlaceDetail} className="p-2 bg-gray-100 rounded-full active:scale-95 transition-all">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
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

              <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <label className="mb-2 block text-sm font-bold text-text-primary">
                  주소
                </label>
                <input
                  value={addressDraft}
                  onChange={(event) => setAddressDraft(event.target.value)}
                  placeholder="네이버 지도에서 확인한 주소를 입력하세요"
                  className="mb-3 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {updateError && (
                  <p className="mb-3 text-sm text-red-500">{updateError}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleFindBranch(selectedPlace)}
                    className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-bold text-text-primary active:scale-[0.98] transition-all"
                  >
                    지점 찾기
                  </button>
                  <button
                    onClick={handleUpdateAddress}
                    disabled={isUpdatingAddress}
                    className="h-11 rounded-xl bg-primary text-sm font-bold text-white active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {isUpdatingAddress ? "저장 중..." : "주소 저장"}
                  </button>
                </div>
              </div>

              <button 
                onClick={() => handleNaverMap(selectedPlace)}
                disabled={!selectedPlace.address}
                className="w-full h-[52px] flex items-center justify-center gap-2 bg-[#03C75A] text-white rounded-xl font-bold text-base shadow-[0_8px_16px_rgba(3,199,90,0.2)] active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:active:scale-100"
              >
                {selectedPlace.address ? "네이버 지도로 확인하기" : "주소 정보가 필요합니다"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
