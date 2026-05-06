"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Map, CustomOverlayMap, useKakaoLoader, MarkerClusterer } from "react-kakao-maps-sdk";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { id: "all", label: "전체", icon: "explore" },
  { id: "cafe", label: "카페", icon: "coffee" },
  { id: "restaurant", label: "식당", icon: "restaurant" },
  { id: "bar", label: "술집", icon: "local_bar" },
  { id: "culture", label: "문화공간", icon: "theater_comedy" },
  { id: "shopping", label: "쇼룸", icon: "shopping_bag" },
  { id: "nature", label: "자연", icon: "forest" },
  { id: "stay", label: "숙소", icon: "hotel" },
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
  },
  {
    id: "demo3",
    name: "피치스 도원",
    address: "서울 성동구 연무장3길 9",
    description: "자동차 문화를 기반으로 한 복합문화공간 및 도넛",
    url: "https://www.instagram.com/peaches_d8ne",
    lat: 37.5446,
    lng: 127.0538,
    rating: 4.4,
    categories: ["culture", "cafe"],
    detailed_highlights: "• 전시된 멋진 자동차들과 인증샷 필수\n• 노티드 도넛과 젤라또를 즐길 수 있는 공간\n• 힙한 스트릿 감성의 결정체"
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
  const [hasFirstPlace, setHasFirstPlace] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedPlaces, setAnalyzedPlaces] = useState<Place[]>([]);
  const [memoInputs, setMemoInputs] = useState<Record<number, string>>({});
  const [folderInputs, setFolderInputs] = useState<Record<number, string>>({});
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [visiblePlaces, setVisiblePlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(["all"]);
  
  const [isListView, setIsListView] = useState(false);
  const [isMiniFabOpen, setIsMiniFabOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isBottomSheetMinimized, setIsBottomSheetMinimized] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'light': navigator.vibrate(10); break;
        case 'medium': navigator.vibrate(30); break;
        case 'success': navigator.vibrate([20, 50, 20]); break;
        case 'error': navigator.vibrate([50, 50, 50, 50]); break;
      }
    }
  };

  const showToast = (msg: string, type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    triggerHaptic(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      if (isDemoMode) {
        setPlaces(DEMO_PLACES);
        return;
      }
      const token = (session as any)?.accessToken;
      if (token) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/places`, {
            headers: { "Authorization": `Bearer ${token}` },
            credentials: "include"
          });
          const data = await res.json();
          if (data.status === "success") setPlaces(data.data);
        } catch (err) {}
      }
      return;
    }

    if (isDemoMode) {
      setPlaces(DEMO_PLACES.filter(p => p.name.includes(query) || p.address.includes(query)));
      return;
    }
    
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?q=${encodeURIComponent(query)}`, {
        headers: { "Authorization": `Bearer ${token || ""}` },
        credentials: "include"
      });
      const data = await res.json();
      if (data.status === "success") {
        setPlaces(data.data);
        if (data.data.length > 0) {
          const first = data.data[0];
          if (first.lat && first.lng) setMapCenter({ lat: first.lat, lng: first.lng });
        }
      }
    } catch (err) {
      console.error("Search failed", err);
    }
  };

  useEffect(() => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
      const visible = places.filter((p) => {
        const matchesCategory = selectedCategoryIds.includes("all") || (p.categories && selectedCategoryIds.some(id => p.categories.includes(id)));
        if (!matchesCategory) return false;

        if (!mapBounds) return true;
        if (!p.lat || !p.lng) return false;
        try {
          const position = new window.kakao.maps.LatLng(p.lat, p.lng);
          return mapBounds.contain(position);
        } catch (e) {
          return true;
        }
      });
      setVisiblePlaces(visible);
    } else {
      setVisiblePlaces(places);
    }
  }, [places, mapBounds, selectedCategoryIds]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn("Geolocation failed", err);
          setMapCenter({ lat: 37.5665, lng: 126.9780 });
        },
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || isDemoMode) return;
    const fetchPlaces = async () => {
      if (!session) {
        setPlaces([]);
        return;
      }
      
      const token = (session as any)?.accessToken;
      if (!token) {
        signOut();
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/places`, {
          headers: { "Authorization": `Bearer ${token}` },
          credentials: "include"
        });
        
        if (res.status === 401) {
          showToast("세션이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => signOut(), 1500);
          return;
        }
        
        const data = await res.json();
        if (data.status === "success") {
          setPlaces(data.data);
          setHasFirstPlace(data.data.length > 0);
        }
      } catch (err) {
        console.error("Failed to load places", err);
      }
    };
    fetchPlaces();
  }, [session, status, isDemoMode]);

  const handleToggleDemo = () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setPlaces([]);
      setMapCenter({ lat: 37.5665, lng: 126.9780 });
    } else {
      setIsDemoMode(true);
      setPlaces(DEMO_PLACES);
      setMapCenter({ lat: DEMO_PLACES[0].lat, lng: DEMO_PLACES[0].lng });
    }
  };

  const handleAnalyze = async () => {
    if (!urlInput.trim()) return;

    const existingPlace = places.find(p => p.url === urlInput.trim());
    if (existingPlace) {
      showToast("이미 저장된 장소입니다!");
      setSelectedPlace(existingPlace);
      if (existingPlace.lat && existingPlace.lng) {
        setMapCenter({ lat: existingPlace.lat, lng: existingPlace.lng });
        if (mapInstance) mapInstance.setLevel(3);
      }
      setIsModalOpen(false);
      setUrlInput("");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.status === "success") setAnalyzedPlaces(data.data);
      else showToast(data.message || "분석에 실패했습니다.");
    } catch (error) {
      showToast("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (place: Place, memo?: string, folder?: string) => {
    if (!session) {
      showToast("로그인이 필요합니다.");
      signIn("google");
      return;
    }

    const token = (session as any)?.accessToken;
    if (!token) {
      showToast("로그인 정보가 만료되었습니다.");
      setTimeout(() => signOut(), 1500);
      return;
    }

    try {
      let lat = place.lat;
      let lng = place.lng;

      if (!lat || !lng) {
        const geocoder = new window.kakao.maps.services.Geocoder();
        const searchResult = await new Promise<any>((resolve) => {
          geocoder.addressSearch(place.address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) resolve(result[0]);
            else resolve(null);
          });
        });
        if (searchResult) {
          lat = parseFloat(searchResult.y);
          lng = parseFloat(searchResult.x);
        } else {
          showToast("📍 위치를 찾을 수 없습니다.");
          return;
        }
      }

      const placeToSave = { ...place, url: urlInput, lat, lng, user_email: session?.user?.email, memo, folder: folder || '기본 폴더' };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/save-place`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify(placeToSave),
      });

      const data = await res.json();
      if (data.status === "success") {
        showToast(`'${place.name}' 장소가 저장되었습니다!`, 'success');
        if (isDemoMode) setIsDemoMode(false);
        setPlaces(prev => [{ ...placeToSave, id: Date.now().toString() }, ...prev]);
        setHasFirstPlace(true);
        setIsModalOpen(false);
        setUrlInput("");
        setAnalyzedPlaces([]);
      } else {
        showToast(data.message);
      }
    } catch (error) {
      showToast("저장 중 오류가 발생했습니다.");
    }
  };

  const isDataEmpty = !hasFirstPlace && !isDemoMode;

  return (
    <div className="relative w-full h-screen bg-map-bg text-on-surface overflow-hidden selection:bg-primary-container selection:text-on-primary-container font-body">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-gutter py-sm bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-surface-container-highest rounded-full p-1.5 flex items-center justify-center">
             <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M50 10 C35 10 23 22 23 37 C23 57 50 90 50 90 C50 90 77 57 77 37 C77 22 65 10 50 10 Z" fill="none" stroke="#FF6B6B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M40 30 Q50 20 60 30 Q70 40 50 45 Q30 50 40 60 Q50 70 60 60" fill="none" stroke="#FF6B6B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="50" cy="37" r="5" fill="#FF6B6B"/>
             </svg>
          </div>
          <span className="ml-2 font-display text-h1 font-bold text-white hidden sm:block">Sple</span>
        </div>

        <div className="flex-1 max-w-md mx-4">
          <div className="glass-floating rounded-full flex items-center px-4 py-2 hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
            <input 
              className="bg-transparent border-none outline-none text-body-md text-on-surface w-full placeholder:text-on-surface-variant focus:ring-0 p-0" 
              placeholder="어디로 갈까요?" 
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <button onClick={() => signIn("google")} className="bg-sple-red text-white px-5 py-2 rounded-full text-body-md font-bold shadow-sm active:scale-95 transition-all">로그인</button>
      </header>

      {/* Category Chips */}
      <div className="fixed top-[72px] left-0 w-full z-40 overflow-x-auto no-scrollbar py-3 flex items-center gap-2 px-4 bg-transparent pointer-events-auto">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategoryIds.includes(cat.id);
          return (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategoryIds(cat.id === "all" ? ["all"] : [cat.id])}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-body-md font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
                isActive 
                  ? "bg-[#FF6B6B] text-white shadow-md" 
                  : "glass-floating border border-map-border text-white/70 hover:bg-surface-variant/30"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isActive ? 'fill-icon' : ''}`}>{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      <main className="flex-1 h-full relative z-0">
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
              const isSelected = selectedPlace?.id === p.id;

              return p.lat && p.lng && (
                <CustomOverlayMap key={p.id} position={{ lat: p.lat, lng: p.lng }} yAnchor={1}>
                  <div 
                    className={`marker-pin ${isSelected ? 'marker-selected' : ''}`}
                    onClick={() => setSelectedPlace(p)}
                  >
                    <div className="marker-icon">
                      <span className={`material-symbols-outlined text-[20px] ${isSelected ? 'fill-icon' : ''}`}>{catInfo.icon}</span>
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}
          </MarkerClusterer>
        </Map>

        {/* Map Controls */}
        <div className="absolute top-[140px] right-4 flex flex-col gap-2 z-40">
          <div className="glass-floating rounded-2xl flex flex-col overflow-hidden shadow-lg">
            <button 
              onClick={() => mapInstance && mapInstance.setLevel(mapInstance.getLevel() - 1)}
              className="p-3 text-on-surface hover:bg-surface-variant/50 active:scale-90 transition-all border-b border-map-border"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button 
              onClick={() => mapInstance && mapInstance.setLevel(mapInstance.getLevel() + 1)}
              className="p-3 text-on-surface hover:bg-surface-variant/50 active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
          </div>
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                  setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  if (mapInstance) mapInstance.setLevel(5);
                });
              }
            }}
            className="glass-floating p-3 rounded-full text-on-surface hover:bg-surface-variant/50 active:scale-90 transition-all shadow-lg mt-1"
          >
            <span className="material-symbols-outlined">my_location</span>
          </button>
        </div>

        {/* FAB & Tooltip */}
        <div className="absolute right-[16px] bottom-[360px] flex flex-col items-end gap-3 z-[100] pointer-events-auto">
          <AnimatePresence>
            {!isMiniFabOpen && isDataEmpty && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-surface-container-high text-on-surface text-label-sm px-4 py-3 rounded-2xl shadow-lg border border-outline-variant/30 relative max-w-[200px] animate-pulse"
              >
                  지금 바로 링크를 공유해보세요!
                  <div className="absolute -bottom-2 right-6 w-4 h-4 bg-surface-container-high border-b border-r border-outline-variant/30 transform rotate-45"></div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => { triggerHaptic('medium'); setIsModalOpen(true); }} 
            className="bg-sple-red text-white p-4 rounded-full shadow-[0_8px_24px_rgba(255,107,107,0.4)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[28px] fill-icon">add_link</span>
          </button>
        </div>
      </main>

      {/* Bottom Sheet */}
      <motion.div 
        className="absolute bottom-0 w-full bg-map-surface/95 backdrop-blur-2xl rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-50 flex flex-col border-t border-l border-r border-map-border"
        animate={{ height: isBottomSheetMinimized ? '80px' : (isListView && !selectedPlace ? '85%' : (selectedPlace ? '80%' : (isDataEmpty ? '420px' : '280px'))) }}
        transition={{ type: "spring", damping: 30, stiffness: 150 }}
      >
        <div 
          className="w-full flex justify-center py-4 cursor-pointer absolute top-0 z-10 group" 
          onClick={() => setIsBottomSheetMinimized(!isBottomSheetMinimized)}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full group-hover:bg-white/40 transition-colors" />
        </div>
        
        <div className={`px-6 pb-10 overflow-y-auto flex-1 no-scrollbar pt-10 ${isBottomSheetMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
          {selectedPlace ? (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-3xl mx-auto">
              <button 
                onClick={() => setSelectedPlace(null)} 
                className="flex items-center gap-2 text-on-surface-variant mb-6 hover:text-white transition-colors group"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                <span className="text-xs font-bold uppercase tracking-widest">탐색기로 돌아가기</span>
              </button>
              
              {selectedPlace.image_url && (
                <div className="w-full h-56 rounded-2xl overflow-hidden mb-8 shadow-xl border border-map-border">
                  <img src={selectedPlace.image_url} alt={selectedPlace.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex flex-col gap-1 mb-6">
                <div className="flex items-center gap-2">
                  <span className="bg-primary-container/20 text-primary-container px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary-container/10">
                    {selectedPlace.categories?.[0] || 'Place'}
                  </span>
                  {selectedPlace.folder && (
                    <span className="text-on-surface-variant text-[10px] font-bold">📁 {selectedPlace.folder}</span>
                  )}
                </div>
                <h2 className="text-4xl font-display font-bold text-white tracking-tight leading-tight">{selectedPlace.name}</h2>
                <div className="flex items-center gap-1.5 text-on-surface-variant mt-2">
                   <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                   <p className="text-sm font-medium">{selectedPlace.address}</p>
                </div>
              </div>
              
              <div className="glass-panel p-6 rounded-2xl mb-8 border-outline-variant/20 shadow-inner">
                <p className="text-lg font-medium leading-relaxed text-white/90 italic">&quot;{selectedPlace.description}&quot;</p>
              </div>

              {selectedPlace.detailed_highlights && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4 text-tertiary">
                    <span className="material-symbols-outlined fill-icon animate-pulse">auto_awesome</span>
                    <h3 className="text-xs font-bold uppercase tracking-widest">AI 요약 포인트</h3>
                  </div>
                  <div className="grid gap-3">
                    {selectedPlace.detailed_highlights.split('\n').filter(line => line.trim()).map((highlight, idx) => (
                      <div key={idx} className="flex items-start gap-4 glass-floating p-4 rounded-xl border-outline-variant/10">
                        <div className="mt-0.5 w-6 h-6 bg-tertiary/20 text-tertiary rounded-lg flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        </div>
                        <p className="text-sm font-medium text-on-surface/90 leading-snug">{highlight.replace(/^[-\*\s•]+/, '')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-8">
                <a 
                  href={`https://map.kakao.com/link/search/${encodeURIComponent(selectedPlace.name)}`}
                  target="_blank" rel="noreferrer" 
                  className="flex flex-col items-center justify-center gap-2 py-5 glass-floating rounded-2xl hover:bg-surface-variant/50 transition-all group shadow-md"
                >
                   <span className="material-symbols-outlined text-[#FAE100]">map</span>
                   <span className="text-[10px] font-bold uppercase text-white/60">카카오맵</span>
                </a>
                <a 
                  href={`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(selectedPlace.name)}`}
                  target="_blank" rel="noreferrer" 
                  className="flex flex-col items-center justify-center gap-2 py-5 glass-floating rounded-2xl hover:bg-surface-variant/50 transition-all group shadow-md"
                >
                   <span className="material-symbols-outlined text-[#03C75A]">location_on</span>
                   <span className="text-[10px] font-bold uppercase text-white/60">네이버 지도</span>
                </a>
                <a 
                  href={selectedPlace.url}
                  target="_blank" rel="noreferrer" 
                  className="flex flex-col items-center justify-center gap-2 py-5 glass-floating rounded-2xl hover:bg-surface-variant/50 transition-all group shadow-md"
                >
                   <span className="material-symbols-outlined text-primary">bookmark</span>
                   <span className="text-[10px] font-bold uppercase text-white/60">인스타그램</span>
                </a>
              </div>

              <div className="flex flex-col gap-3 pb-6">
                <a 
                  href={`https://map.kakao.com/link/to/${selectedPlace.name},${selectedPlace.lat},${selectedPlace.lng}`}
                  target="_blank" rel="noreferrer" 
                  className="w-full bg-primary-container text-on-primary-container py-4 rounded-xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-primary-container/20 active:scale-95 transition-all text-base"
                >
                  <span className="material-symbols-outlined fill-icon">navigation</span>
                  지금 길찾기 시작
                </a>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href + `?url=${encodeURIComponent(selectedPlace.url)}`);
                    showToast("링크가 복사되었습니다!");
                  }}
                  className="w-full glass-floating text-white py-4 rounded-xl flex items-center justify-center gap-3 font-bold active:scale-95 transition-all text-base border-outline-variant/30"
                >
                  <span className="material-symbols-outlined">link</span>
                  친구에게 장소 공유하기
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              {isDataEmpty ? (
                <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-700">
                  <div className="w-24 h-24 rounded-full bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center mb-8 shadow-2xl relative">
                    <div className="absolute inset-0 rounded-full bg-sple-red/20 blur-2xl animate-pulse"></div>
                    <span className="material-symbols-outlined text-sple-red text-[48px] relative z-10 fill-icon">auto_awesome</span>
                  </div>
                  <h2 className="font-display text-3xl font-bold text-white mb-4 tracking-tight">인스타 핫플을<br/>가장 쉽게 저장하세요</h2>
                  <p className="text-on-surface-variant text-lg max-w-xs mb-10 leading-relaxed font-medium">
                      게시물의 [공유하기] 버튼을 눌러 스플로 보내면 AI가 알아서 찾아드려요!
                  </p>
                  
                  <button 
                    onClick={handleToggleDemo}
                    className="w-full max-w-sm bg-surface-container-highest border border-sple-red/30 text-white font-bold py-5 rounded-2xl hover:bg-surface-variant/80 active:scale-95 transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-sple-red/5 group-hover:bg-sple-red/10 transition-colors"></div>
                    <span className="relative z-10">성수동 에디터 픽 미리보기</span>
                    <span className="material-symbols-outlined text-sple-red relative z-10">arrow_forward</span>
                  </button>
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-display font-bold text-white tracking-tight">
                      {isDemoMode ? '성수동 에디터 픽' : '내 핫플'}
                      <span className="ml-2 text-on-surface-variant text-sm font-medium">{visiblePlaces.length}</span>
                    </h2>
                    <button 
                      onClick={() => setIsListView(!isListView)}
                      className="glass-floating px-4 py-2 rounded-full text-xs font-bold text-white/80 flex items-center gap-2 border-outline-variant/20"
                    >
                      <span className="material-symbols-outlined text-sm">{isListView ? 'map' : 'list'}</span>
                      {isListView ? '지도 보기' : '목록 보기'}
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {visiblePlaces.map(p => (
                      <motion.div 
                        key={p.id} 
                        onClick={() => setSelectedPlace(p)} 
                        whileHover={{ y: -4, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-5 p-5 glass-floating rounded-2xl cursor-pointer transition-all border-outline-variant/10 group shadow-lg"
                      >
                        <div className="w-14 h-14 bg-surface-container-highest text-primary flex items-center justify-center rounded-xl shrink-0 group-hover:bg-primary-container group-hover:text-on-primary-container transition-all">
                          <span className="material-symbols-outlined text-[28px]">{CATEGORIES.find(c => c.id === (p.categories?.[0] || 'other'))?.icon || 'location_on'}</span>
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <h4 className="font-bold text-lg truncate text-white tracking-tight mb-1">{p.name}</h4>
                          <div className="flex items-center gap-1 opacity-60">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <p className="text-xs truncate font-medium">{p.address}</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-white transition-colors">chevron_right</span>
                      </motion.div>
                    ))}
                  </div>
                  {isDemoMode && (
                    <button 
                      onClick={handleToggleDemo}
                      className="mt-8 text-on-surface-variant font-bold text-sm flex items-center gap-2 mx-auto hover:text-white"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      내 지도로 돌아가기
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex justify-center items-end bg-black/80 backdrop-blur-md sm:items-center p-0 sm:p-6">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-md bg-map-surface rounded-t-[32px] sm:rounded-[32px] px-8 pt-10 pb-10 shadow-2xl flex flex-col max-h-[90vh] border border-map-border"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-1">Link Scrap</span>
                  <h3 className="text-3xl font-display font-bold text-white tracking-tight italic">AI 자동 분석</h3>
                </div>
                <button onClick={() => { setIsModalOpen(false); setAnalyzedPlaces([]); }} className="w-12 h-12 glass-floating rounded-full flex items-center justify-center hover:bg-sple-red hover:text-white transition-all active:scale-90">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-24 h-24 bg-surface-container-highest rounded-full flex items-center justify-center mb-8 text-primary shadow-2xl border border-primary/20"
                  >
                    <span className="material-symbols-outlined text-[48px] fill-icon">auto_awesome</span>
                  </motion.div>
                  <h4 className="text-2xl font-bold text-white mb-3">AI 분석 중...</h4>
                  <p className="text-on-surface-variant text-center leading-relaxed font-medium">
                    핫플의 숨겨진 매력과 위치를<br/>똑똑하게 찾아내고 있어요 ✨
                  </p>
                </div>
              ) : !analyzedPlaces.length ? (
                <div className="flex flex-col gap-8">
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">인스타그램 링크</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        placeholder="https://www.instagram.com/p/..."
                        className="w-full glass-panel px-6 py-5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium text-white placeholder:text-white/20"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <button
                        onClick={async () => {
                          const text = await navigator.clipboard.readText();
                          setUrlInput(text);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined">content_paste</span>
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isLoading || !urlInput.trim()}
                    className="w-full bg-gradient-to-br from-primary-container to-primary text-on-primary-container py-5 rounded-2xl font-bold flex justify-center items-center gap-3 shadow-xl shadow-primary-container/20 hover:brightness-110 disabled:opacity-30 active:scale-95 transition-all text-lg"
                  >
                    <span className="material-symbols-outlined fill-icon">auto_awesome</span>
                    AI 분석 시작하기
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6">
                  {analyzedPlaces.map((place, idx) => (
                    <div key={idx} className="glass-panel p-6 rounded-2xl border-outline-variant/10 shadow-xl">
                      <div className="flex justify-between items-start mb-4">
                        <h5 className="font-bold text-2xl text-white tracking-tight">{place.name}</h5>
                        <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-primary/10">
                          {place.categories?.[0] || 'NEW'}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 text-on-surface-variant mb-5">
                         <span className="material-symbols-outlined text-[16px]">location_on</span>
                         <p className="text-xs font-medium leading-tight">{place.address}</p>
                      </div>
                      <div className="flex flex-col gap-3 mb-6">
                        <input 
                          type="text" 
                          placeholder="폴더 지정 (예: 데이트 코스)" 
                          className="w-full bg-surface-container-highest/50 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-outline-variant/20 focus:border-primary/50 transition-colors text-white"
                          value={folderInputs[idx] || ""}
                          onChange={(e) => setFolderInputs(prev => ({...prev, [idx]: e.target.value}))}
                        />
                        <textarea 
                          placeholder="개인 메모" 
                          className="w-full bg-surface-container-highest/50 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-outline-variant/20 focus:border-primary/50 transition-colors text-white resize-none h-20"
                          value={memoInputs[idx] || ""}
                          onChange={(e) => setMemoInputs(prev => ({...prev, [idx]: e.target.value}))}
                        />
                      </div>
                      <button 
                        onClick={() => handleSave(place, memoInputs[idx], folderInputs[idx])}
                        className="w-full bg-primary-container text-on-primary-container rounded-xl text-base font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all py-4"
                      >
                        내 지도에 추가하기
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-surface-container-highest text-white px-6 py-3 rounded-full shadow-2xl border border-outline-variant/30 font-bold text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
