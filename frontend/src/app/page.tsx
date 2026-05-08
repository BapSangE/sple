"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Map, CustomOverlayMap, useKakaoLoader, MarkerClusterer } from "react-kakao-maps-sdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coffee, Utensils, Wine, ShoppingBag, Camera, Trees, Hotel,
  Globe
} from "lucide-react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { FAB } from "@/components/ui/FAB";

const CATEGORIES = [
  { id: "all", label: "전체", icon: Globe },
  { id: "cafe", label: "카페", icon: Coffee },
  { id: "restaurant", label: "식당", icon: Utensils },
  { id: "bar", label: "술집", icon: Wine },
  { id: "culture", label: "문화공간", icon: Camera },
  { id: "shopping", label: "쇼룸", icon: ShoppingBag },
  { id: "nature", label: "자연", icon: Trees },
  { id: "stay", label: "숙소", icon: Hotel },
];

const DEMO_PLACES: Place[] = [
  {
    id: "demo1",
    name: "어니언 성수",
    address: "서울 성동구 아차산로9길 8",
    description: "성수동의 폐공장을 개조한 빈티지 감성의 베이커리 카페",
    url: "https://www.instagram.com/onion.seongsu",
    lat: 37.5445,
    lng: 127.0575,
    rating: 4.5,
    categories: ["cafe"],
    detailed_highlights: "• 폐공장의 거친 매력이 살아있는 독특한 인테리어\n• 시그니처 빵 팡도르 필수 주문\n• 널찍한 루프탑과 중정"
  },
  {
    id: "demo2",
    name: "제스티살룬 성수",
    address: "서울 성동구 서울숲2길 19",
    description: "새우버거가 기가 막히는 성수동 수제버거 맛집",
    url: "https://www.instagram.com/zestysaloon",
    lat: 37.5463,
    lng: 127.0405,
    rating: 4.8,
    categories: ["restaurant"],
    detailed_highlights: "• 통통한 새우살이 씹히는 와사비 쉬림프 버거\n• 웨이팅이 길지만 기다릴 가치가 있는 맛\n• 힙한 감성의 매장 분위기"
  }
];

interface Place {
  id: string;
  name: string;
  address: string;
  description: string;
  url: string;
  lat: number;
  lng: number;
  rating: number;
  categories: string[];
  detailed_highlights?: string;
  memo?: string;
  folder?: string;
  image_url?: string;
}

export default function Home() {
  const { data: session, status } = useSession();

  useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_API_KEY || "",
    libraries: ["services", "clusterer"],
  });

  const [places, setPlaces] = useState<Place[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedPlaces, setAnalyzedPlaces] = useState<Place[]>([]);
  const [selectedAnalyzedIndices, setSelectedAnalyzedIndices] = useState<number[]>([]);
  const [memoInputs, setMemoInputs] = useState<Record<number, string>>({});
  const [folderInputs, setFolderInputs] = useState<Record<number, string>>({});
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [mapBounds, setMapBounds] = useState<kakao.maps.LatLngBounds | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(["all"]);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isBottomSheetMinimized, setIsBottomSheetMinimized] = useState(false);
  const [mapInstance, setMapInstance] = useState<kakao.maps.Map | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'light': navigator.vibrate(10); break;
        case 'medium': navigator.vibrate(30); break;
        case 'success': navigator.vibrate([20, 50, 20]); break;
        case 'error': navigator.vibrate([50, 50, 50, 50]); break;
      }
    }
  }, []);

  const showToast = useCallback((msg: string, type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    triggerHaptic(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, [triggerHaptic]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      const token = (session as { accessToken?: string })?.accessToken;
      if (token && !isDemoMode) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/places`, {
            headers: { "Authorization": `Bearer ${token}` },
            credentials: "include"
          });
          const data = await res.json();
          if (data.status === "success") setPlaces(data.data);
        } catch {
          // ignore
        }
      } else if (isDemoMode) {
        setPlaces(DEMO_PLACES);
      }
      return;
    }

    if (isDemoMode) {
      setPlaces(DEMO_PLACES.filter(p => p.name.includes(query) || p.address.includes(query)));
      return;
    }

    try {
      const token = (session as { accessToken?: string })?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?q=${encodeURIComponent(query)}`, {
        headers: { "Authorization": `Bearer ${token || ""}` },
        credentials: "include"
      });
      const data = await res.json();
      if (data.status === "success") setPlaces(data.data);
    } catch (err) {
      console.error("Search failed", err);
    }
  };

  // 필터링된 장소 목록을 useMemo로 관리하여 useEffect 내 setState 경고 제거
  const visiblePlaces = useMemo(() => {
    return places.filter((p) => {
      const matchesCategory = selectedCategoryIds.includes("all") || (p.categories && selectedCategoryIds.some(id => p.categories.includes(id)));
      if (!matchesCategory) return false;
      if (!mapBounds) return true;
      if (!p.lat || !p.lng) return false;
      try {
        if (typeof window !== "undefined" && window.kakao && window.kakao.maps) {
          const position = new window.kakao.maps.LatLng(p.lat, p.lng);
          return mapBounds.contain(position);
        }
        return true;
      } catch { return true; }
    });
  }, [places, mapBounds, selectedCategoryIds]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => { setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude }); },
        () => { setMapCenter({ lat: 37.5665, lng: 126.9780 }); },
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || isDemoMode) return;
    const fetchPlaces = async () => {
      if (!session) { setPlaces([]); return; }
      const token = (session as { accessToken?: string })?.accessToken;
      if (!token) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/places`, {
          headers: { "Authorization": `Bearer ${token}` },
          credentials: "include"
        });
        if (res.status === 401) {
          showToast("로그인 세션이 만료되었습니다. 다시 로그인해주세요.", "error");
          return;
        }
        const data = await res.json();
        if (data.status === "success") {
          setPlaces(data.data);
        } else { setPlaces([]); }
      } catch {
        setPlaces([]);
      }
    };
    fetchPlaces();
  }, [session, status, isDemoMode, showToast]);

  const handleToggleDemo = () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setPlaces([]);
      setMapCenter({ lat: 37.5665, lng: 126.9780 });
    } else {
      setIsDemoMode(true);
      setPlaces(DEMO_PLACES);
      setMapCenter({ lat: DEMO_PLACES[0].lat, lng: DEMO_PLACES[0].lng });
      if (mapInstance) {
        mapInstance.setCenter(new window.kakao.maps.LatLng(DEMO_PLACES[0].lat, DEMO_PLACES[0].lng));
        mapInstance.setLevel(5);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!urlInput.trim()) return;
    const existingPlace = places.find(p => p.url === urlInput.trim());
    if (existingPlace) {
      showToast("이미 저장된 장소입니다!");
      setSelectedPlace(existingPlace);
      setIsModalOpen(false);
      return;
    }

    setIsLoading(true);
    triggerHaptic('medium');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (!data.data || data.data.length === 0) {
          showToast("장소 정보를 찾을 수 없습니다. 다른 게시물로 시도해 주세요.", "error");
          setAnalyzedPlaces([]);
        } else {
          setAnalyzedPlaces(data.data);
          setSelectedAnalyzedIndices(data.data.map((_: Place, i: number) => i)); // 기본 전체 선택
        }
      }
    } catch { showToast("서버 연결에 실패했습니다.", "error"); }
    finally { setIsLoading(false); }
  };

  const handleMultiSave = async () => {
    if (!session) { signIn("google"); return; }
    if (selectedAnalyzedIndices.length === 0) {
      showToast("저장할 장소를 선택해 주세요.", "error");
      return;
    }

    setIsLoading(true);
    let successCount = 0;

    const token = (session as { accessToken?: string })?.accessToken;
    if (!token) { signIn("google"); return; }

    for (const idx of selectedAnalyzedIndices) {
      const place = analyzedPlaces[idx];
      try {
        const placeToSave = { ...place, url: urlInput, user_email: session?.user?.email, memo: memoInputs[idx], folder: folderInputs[idx] || "기본 폴더" };
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/save-place`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          credentials: "include",
          body: JSON.stringify(placeToSave),
        });
        if (res.ok) {
          successCount++;
          setPlaces(prev => [{ ...placeToSave, id: (Date.now() + idx).toString() }, ...prev]);
        }
      } catch {
        // ignore
      }
    }

    setIsLoading(false);
    if (successCount > 0) {
      showToast(`${successCount}개의 장소가 저장되었습니다!`, "success");
      setIsModalOpen(false);
      setUrlInput("");
      setAnalyzedPlaces([]);
      setSelectedAnalyzedIndices([]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-background text-on-surface overflow-hidden selection:bg-sple-red/30 font-body-md">
      {toastMessage && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-surface-container-high border border-guide-mint/30 rounded-full py-2 px-4 shadow-lg flex items-center gap-2 z-50 animate-bounce">
          <span className="material-symbols-outlined text-guide-mint text-[18px] fill">check_circle</span>
          <span className="font-label-sm text-label-sm text-on-surface">{toastMessage}</span>
        </div>
      )}

      {/* Map Canvas (Background) */}
      <main className="absolute inset-0 z-0">
        <Map
          center={mapCenter}
          style={{ width: "100%", height: "100%" }}
          level={7}
          onCreate={setMapInstance}
          onIdle={(map) => setMapBounds(map.getBounds())}
        >
          <MarkerClusterer averageCenter={true} minLevel={5}>
            {visiblePlaces.map((p) => {
              const mainCatId = p.categories?.[0] || "other";
              const catInfo = CATEGORIES.find(c => c.id === mainCatId) || CATEGORIES[CATEGORIES.length - 1];
              const CatIcon = catInfo.icon;
              const isSelected = selectedPlace?.id === p.id;

              return p.lat && p.lng && (
                <CustomOverlayMap key={p.id} position={{ lat: p.lat, lng: p.lng }} yAnchor={1}>
                  <div className="cursor-pointer" onClick={() => { setSelectedPlace(p); triggerHaptic('medium'); }}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${isSelected
                        ? 'bg-sple-red text-white scale-110 shadow-[0_0_15px_#ff6b6b80] border-2 border-sple-red'
                        : 'bg-glass-bg backdrop-blur-md text-sple-red border border-sple-red/30 opacity-90'
                      }`}>
                      <CatIcon size={20} strokeWidth={2.5} />
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}
          </MarkerClusterer>
        </Map>
      </main>

      {/* Top App Bar */}
      <TopAppBar
        onProfileClick={() => {
          if (session) signOut();
          else signIn("google");
        }}
      />

      {/* Smart Search & Filter Layer */}
      <div className="fixed top-24 left-0 right-0 z-40 px-safe-margin flex flex-col gap-stack-sm pointer-events-none">
        {/* Search Bar */}
        <div className="bg-glass-bg backdrop-blur-xl rounded-full p-1 pl-4 pr-1 flex items-center shadow-lg pointer-events-auto border border-outline/10">
          <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
          <label htmlFor="main-search-input" className="sr-only">장소 검색</label>
          <input
            id="main-search-input"
            className="bg-transparent border-none focus:ring-0 text-on-surface grow font-body-md text-body-md placeholder:text-on-surface-variant/70 outline-none"
            placeholder="어디로 갈까요?"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />

          <button className="bg-surface-variant text-on-surface rounded-full w-10 h-10 flex items-center justify-center hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pointer-events-auto pb-2 -mx-safe-margin px-safe-margin">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryIds([cat.id])}
              className={`font-label-sm text-label-sm px-4 py-2 rounded-full whitespace-nowrap shadow-sm border transition-all active:scale-95 ${selectedCategoryIds.includes(cat.id)
                  ? "bg-primary-container text-on-primary-container border-transparent font-bold"
                  : "bg-surface-container text-on-surface border-outline/20 hover:bg-surface-container-high"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-[160px] right-safe-margin flex flex-col gap-2 z-40">
        <button
          onClick={() => navigator.geolocation.getCurrentPosition(pos => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
          className="bg-surface-container/80 backdrop-blur-xl p-3 rounded-full text-on-surface shadow-2xl border border-outline/20 hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">my_location</span>
        </button>
      </div>

      {/* FAB */}
      <FAB onClick={() => setIsModalOpen(true)} className="bottom-24 md:bottom-32" />

      {/* Bottom Sheet */}
      <motion.div
        className="absolute bottom-0 w-full bg-surface border-t border-outline-variant/30 rounded-t-3xl shadow-2xl z-50 flex flex-col"
        animate={{ height: isBottomSheetMinimized ? '80px' : (selectedPlace ? '95%' : (places.length > 0 ? '50%' : '340px')) }}
        transition={{ type: "spring", damping: 30, stiffness: 150 }}
      >
        <div className="w-full flex justify-center pt-3 pb-2 shrink-0 touch-none cursor-pointer" onClick={() => setIsBottomSheetMinimized(!isBottomSheetMinimized)}>
          <div className="w-12 h-1.5 bg-outline-variant rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-safe-margin pb-24">
          {selectedPlace ? (
            <div className="flex flex-col gap-stack-lg pt-4 relative">
              <div className="flex flex-col gap-stack-sm">
                <button onClick={() => setSelectedPlace(null)} className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface mb-2 w-fit">
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest">돌아가기</span>
                </button>
                <div className="flex justify-between items-start">
                  <h1 className="font-display-lg text-display-lg text-on-surface">{selectedPlace.name}</h1>
                  <div className="flex items-center gap-1 bg-surface-container-highest px-3 py-1 rounded-full">
                    <span className="material-symbols-outlined text-sple-red text-[16px] fill">star</span>
                    <span className="font-label-sm text-label-sm text-on-surface">{selectedPlace.rating || 4.5}</span>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">location_on</span> {selectedPlace.address}
                </p>
                <p className="font-body-md text-body-md text-on-surface mt-2 italic bg-surface-container-low p-4 rounded-xl border border-surface-container-highest">
                  &quot;{selectedPlace.description}&quot;
                </p>
              </div>

              {selectedPlace.detailed_highlights && (
                <div className="relative overflow-hidden rounded-xl bg-smart-purple/10 border border-smart-purple/30 p-stack-md backdrop-blur-md">
                  <div className="absolute inset-0 bg-linear-to-br from-smart-purple/20 to-transparent opacity-50 pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col gap-stack-sm">
                    <div className="flex items-center gap-2 text-smart-purple">
                      <span className="material-symbols-outlined text-[20px] fill">auto_awesome</span>
                      <span className="font-title-sm text-title-sm font-bold">AI Highlight</span>
                    </div>
                    <div className="space-y-2 mt-2">
                      {selectedPlace.detailed_highlights.split('\n').map((h, i) => (
                        <div key={i} className="flex items-start gap-2 bg-surface-container-highest/50 rounded-lg p-3">
                          <span className="material-symbols-outlined text-guide-mint text-[16px] mt-0.5">check_circle</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">{h.replace(/^[•\s-]+/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bento Grid */}
              <div className="grid grid-cols-2 gap-gutter mt-2">
                <div className="bg-surface-container-low rounded-xl p-stack-md flex flex-col gap-1 border border-surface-container-highest">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">schedule</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">운영 정보</span>
                  <span className="font-title-sm text-title-sm text-on-surface">확인 필요</span>
                </div>
                <div className="bg-surface-container-low rounded-xl p-stack-md flex flex-col gap-1 border border-surface-container-highest">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">directions_walk</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">위치</span>
                  <span className="font-title-sm text-title-sm text-on-surface">가까움</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-gutter mt-4">
                <a href={selectedPlace.url} target="_blank" rel="noreferrer" className="flex-1 h-14 bg-surface-container-highest text-on-surface rounded-full flex items-center justify-center gap-2 font-title-sm text-title-sm backdrop-blur-xl border border-surface-variant hover:bg-surface-variant/50 transition-all active:scale-95 duration-200">
                  <span className="material-symbols-outlined">link</span> 원본
                </a>
                <a href={`https://map.kakao.com/link/to/${selectedPlace.name},${selectedPlace.lat},${selectedPlace.lng}`} target="_blank" rel="noreferrer" className="flex-2 h-14 bg-sple-red text-on-primary rounded-full flex items-center justify-center gap-2 font-title-sm text-title-sm font-bold shadow-lg shadow-sple-red/20 hover:bg-sple-red/90 transition-all active:scale-95 duration-200">
                  <span className="material-symbols-outlined fill">near_me</span> 길찾기
                </a>
              </div>
            </div>
          ) : places.length > 0 ? (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-end mb-stack-md">
                <h2 className="font-headline-md text-headline-md text-on-surface">{isDemoMode ? "에디터 픽: 성수" : "내 핫플 목록"}</h2>
                <span className="font-label-sm text-label-sm text-sple-red">{places.length}개</span>
              </div>
              <div className="grid gap-stack-sm pb-12">
                {places.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPlace(p);
                      setMapCenter({ lat: p.lat, lng: p.lng });
                      if (mapInstance) mapInstance.setLevel(3);
                    }}
                    className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl shadow-sm hover:shadow-md border border-transparent hover:border-sple-red/30 transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-sple-red group-hover:bg-sple-red group-hover:text-white transition-all shrink-0">
                      <span className="material-symbols-outlined">location_on</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-title-sm text-title-sm text-on-surface truncate">{p.name}</h4>
                      <p className="font-label-sm text-label-sm text-on-surface-variant truncate mt-1">{p.address}</p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant opacity-50 group-hover:opacity-100 group-hover:text-sple-red transition-all">open_in_new</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center pt-8">
              <div className="w-24 h-24 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center mb-stack-lg shadow-xl relative">
                <div className="absolute inset-0 rounded-full bg-sple-red/20 blur-2xl"></div>
                <span className="material-symbols-outlined text-[48px] text-sple-red relative z-10">explore</span>
              </div>
              <h2 className="font-display-lg text-display-lg text-on-surface mb-2">당신의 지도를 만드세요</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg leading-relaxed max-w-[280px]">
                인스타그램 링크를 복사하고 + 버튼을 눌러<br />AI로 핫플을 분석하고 저장해보세요.
              </p>
              <button onClick={handleToggleDemo} className="w-full max-w-[280px] bg-surface-variant border border-sple-red/50 text-on-surface py-4 rounded-2xl font-title-sm text-title-sm hover:bg-surface-container-highest active:scale-95 transition-all flex items-center justify-center gap-2">
                <span>에디터 픽 미리보기</span>
                <span className="material-symbols-outlined text-[18px] text-sple-red">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mobile Bottom Nav */}
      <BottomNavBar />

      {/* Modal for URL Analysis & Save */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <div className="fixed inset-0 bg-overlay-dim z-200 backdrop-blur-sm transition-opacity" onClick={() => { setIsModalOpen(false); setAnalyzedPlaces([]); }} />
            <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-210 w-full sm:w-[90%] sm:max-w-md bg-glass-bg backdrop-blur-xl border border-outline-variant/30 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-outline-variant/20 shrink-0">
                <h2 className="font-headline-md text-headline-md text-on-surface">장소 분석</h2>
                <button onClick={() => { setIsModalOpen(false); setAnalyzedPlaces([]); }} className="p-2 rounded-full hover:bg-surface-variant/40 transition-colors text-on-surface-variant">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto hide-scrollbar flex flex-col gap-stack-lg">
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center">
                    <div className="w-16 h-16 bg-smart-purple/20 rounded-3xl flex items-center justify-center mb-6 animate-pulse border border-smart-purple/30">
                      <span className="material-symbols-outlined text-[32px] text-smart-purple fill">auto_awesome</span>
                    </div>
                    <p className="font-title-sm text-title-sm text-on-surface text-center">AI가 핫플을 분석하고 있어요...</p>
                  </div>
                ) : !analyzedPlaces.length ? (
                  <>
                    <div className="flex flex-col gap-stack-sm">
                      <label htmlFor="url-input" className="font-label-sm text-label-sm text-on-surface-variant">인스타그램 링크</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-on-surface-variant">link</span>
                        <input
                          id="url-input"
                          className="w-full bg-surface-container-highest/50 border border-outline-variant/50 rounded-xl py-4 pl-12 pr-12 font-body-md text-body-md text-on-surface focus:outline-none focus:border-sple-red focus:ring-1 focus:ring-sple-red transition-all"
                          placeholder="https://instagram.com/p/..."
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                        />
                        <button
                          onClick={async () => setUrlInput(await navigator.clipboard.readText())}
                          className="absolute right-4 text-on-surface-variant hover:text-on-surface transition-colors"
                          title="붙여넣기"
                        >
                          <span className="material-symbols-outlined text-[20px]">content_paste</span>
                        </button>
                      </div>
                    </div>
                    <button onClick={handleAnalyze} className="w-full bg-sple-red text-on-primary-container py-4 rounded-xl font-title-sm text-title-sm shadow-lg shadow-sple-red/20 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined fill">auto_awesome</span> AI 분석 시작
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-stack-lg">
                    {!session && (
                      <div className="p-4 rounded-xl bg-surface-container-low border border-sple-red/30 flex items-start gap-3">
                        <span className="material-symbols-outlined text-sple-red text-[20px] shrink-0">wifi_off</span>
                        <div className="flex flex-col gap-1">
                          <span className="font-label-sm text-label-sm text-on-surface font-bold">비로그인 모드</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">로그인하지 않으면 장소가 클라우드에 저장되지 않습니다.</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-end">
                      <h3 className="font-title-sm text-title-sm text-on-surface">{analyzedPlaces.length}개의 장소를 찾았습니다</h3>
                      <button
                        onClick={() => setSelectedAnalyzedIndices(
                          selectedAnalyzedIndices.length === analyzedPlaces.length ? [] : analyzedPlaces.map((_, i) => i)
                        )}
                        className="font-label-sm text-label-sm text-sple-red hover:underline"
                      >
                        {selectedAnalyzedIndices.length === analyzedPlaces.length ? "전체 해제" : "전체 선택"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-stack-sm">
                      {analyzedPlaces.map((p, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedAnalyzedIndices.includes(i) ? "bg-sple-red/10 border-sple-red/50" : "bg-surface-container-low border-surface-container-highest"
                            }`}
                          onClick={() => setSelectedAnalyzedIndices(prev =>
                            prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                          )}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selectedAnalyzedIndices.includes(i) ? "border-sple-red bg-sple-red" : "border-outline-variant"
                              }`}>
                              {selectedAnalyzedIndices.includes(i) && <div className="w-2.5 h-2.5 rounded-full bg-surface" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-title-sm text-title-sm text-on-surface truncate">{p.name}</h4>
                              <p className="font-label-sm text-label-sm text-on-surface-variant truncate mt-0.5">{p.address}</p>
                            </div>
                          </div>

                          {selectedAnalyzedIndices.includes(i) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              className="mt-3 flex flex-col gap-2 pl-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center bg-surface-container-highest/50 rounded-lg px-3 py-2 border border-outline-variant/30">
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant mr-2">folder</span>
                                <label htmlFor={`folder-input-${i}`} className="sr-only">폴더 지정</label>
                                <input
                                  id={`folder-input-${i}`}
                                  placeholder="폴더 (예: 성수 데이트)"
                                  className="bg-transparent border-none outline-none font-label-sm text-label-sm text-on-surface w-full"
                                  value={folderInputs[i] || ""}
                                  onChange={(e) => setFolderInputs(prev => ({ ...prev, [i]: e.target.value }))}
                                />
                              </div>
                              <div className="flex items-start bg-surface-container-highest/50 rounded-lg px-3 py-2 border border-outline-variant/30">
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant mr-2 mt-0.5">edit_note</span>
                                <label htmlFor={`memo-input-${i}`} className="sr-only">메모 작성</label>
                                <textarea
                                  id={`memo-input-${i}`}
                                  placeholder="개인 메모"
                                  className="bg-transparent border-none outline-none font-label-sm text-label-sm text-on-surface w-full resize-none h-16"
                                  value={memoInputs[i] || ""}
                                  onChange={(e) => setMemoInputs(prev => ({ ...prev, [i]: e.target.value }))}
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={session ? handleMultiSave : () => signIn("google")}
                      className="w-full bg-sple-red text-on-primary-container py-4 rounded-xl font-title-sm text-title-sm shadow-lg shadow-sple-red/20 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                      <span className="material-symbols-outlined fill">bookmark_add</span>
                      {session ? `${selectedAnalyzedIndices.length}개의 장소 저장` : "로그인하고 저장하기"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
