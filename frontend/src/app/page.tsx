"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Map, CustomOverlayMap, useKakaoLoader, MarkerClusterer } from "react-kakao-maps-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, X, Navigation, Bookmark, ArrowLeft, Search, 
  Coffee, Utensils, Wine, ShoppingBag, Camera, Trees, Hotel, 
  Globe, Sparkles, Check, Map as MapIcon, ExternalLink,
  Link as LinkIcon, Play, Minus, LocateFixed, ChevronDown, ChevronUp, WifiOff, ClipboardPaste, MapPin
} from "lucide-react";

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
  const [selectedAnalyzedIndices, setSelectedAnalyzedIndices] = useState<number[]>([]);
  const [memoInputs, setMemoInputs] = useState<Record<number, string>>({});
  const [folderInputs, setFolderInputs] = useState<Record<number, string>>({});
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [visiblePlaces, setVisiblePlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(["all"]);
  
  const [isListView, setIsListView] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isBottomSheetMinimized, setIsBottomSheetMinimized] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      const token = (session as any)?.accessToken;
      if (token && !isDemoMode) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/places`, {
            headers: { "Authorization": `Bearer ${token}` },
            credentials: "include"
          });
          const data = await res.json();
          if (data.status === "success") {
            setPlaces(data.data);
          }
        } catch (err) {}
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
      const token = (session as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?q=${encodeURIComponent(query)}`, {
        headers: { "Authorization": `Bearer ${token || ""}` },
        credentials: "include"
      });
      const data = await res.json();
      if (data.status === "success") {
        setPlaces(data.data);
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
        } catch (e) { return true; }
      });
      setVisiblePlaces(visible);
    } else {
      setVisiblePlaces(places);
    }
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
      const token = (session as any)?.accessToken;
      if (!token) { signOut(); return; }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/places`, {
          headers: { "Authorization": `Bearer ${token}` },
          credentials: "include"
        });
        if (res.status === 401) { signOut(); return; }
        const data = await res.json();
        if (data.status === "success") {
          setPlaces(data.data);
          setHasFirstPlace(data.data.length > 0);
        } else { setPlaces([]); }
      } catch (err) { setPlaces([]); }
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
          setSelectedAnalyzedIndices(data.data.map((_: any, i: number) => i)); // 기본 전체 선택
        }
      }
    } catch (error) { showToast("서버 연결에 실패했습니다."); }
    finally { setIsLoading(false); }
  };

  const handleSave = async (place: Place, memo?: string, folder?: string) => {
    if (!session) { signIn("google"); return; }
    const token = (session as any)?.accessToken;
    if (!token) { signOut(); return; }

    try {
      const placeToSave = { ...place, url: urlInput, user_email: session?.user?.email, memo, folder: folder || '기본 폴더' };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/save-place`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify(placeToSave),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(`'${place.name}' 저장 완료!`);
        if (isDemoMode) setIsDemoMode(false);
        setPlaces(prev => [{ ...placeToSave, id: Date.now().toString() }, ...prev]);
        setHasFirstPlace(true);
        setIsModalOpen(false);
        setUrlInput("");
        setAnalyzedPlaces([]);
      }
    } catch (error) { showToast("저장 중 오류가 발생했습니다."); }
  };

  const handleMultiSave = async () => {
    if (!session) { signIn("google"); return; }
    if (selectedAnalyzedIndices.length === 0) {
      showToast("저장할 장소를 선택해 주세요.", "error");
      return;
    }
    
    setIsLoading(true);
    let successCount = 0;
    
    const token = (session as any)?.accessToken;
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
      } catch (err) {}
    }
    
    setIsLoading(false);
    if (successCount > 0) {
      showToast(`${successCount}개의 장소가 저장되었습니다!`, "success");
      setHasFirstPlace(true);
      setIsModalOpen(false);
      setUrlInput("");
      setAnalyzedPlaces([]);
      setSelectedAnalyzedIndices([]);
    }
  };

  const isDataEmpty = !hasFirstPlace && !isDemoMode;

  return (
    <div className="relative w-full h-screen bg-black text-[#94A3B8] overflow-hidden selection:bg-[#FF6B6B]/30 font-body-md">
      {/* Map Background Area */}
      <main className="absolute inset-0 w-full h-full z-0">
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
                  <div 
                    className="cursor-pointer"
                    onClick={() => setSelectedPlace(p)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${isSelected ? 'bg-[#FF6B6B] text-white scale-110' : 'bg-[#0F172A] text-[#FF6B6B] border border-[#1E293B]'}`}>
                      <CatIcon size={20} strokeWidth={2.5} />
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}
          </MarkerClusterer>
        </Map>
      </main>

      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-3 bg-[#0F172A]/80 backdrop-blur-xl border-b border-[#1E293B]/50 shadow-sm">
        <div className="flex items-center">
          <div className="text-[#FF6B6B]">
            <MapPin size={24} fill="currentColor" />
          </div>
          <span className="ml-2 font-display text-2xl font-bold text-white hidden sm:block">Sple</span>
        </div>

        <div className="flex-1 max-w-md mx-4">
          <div className="bg-[#0F172A]/60 backdrop-blur-2xl border border-[#1E293B] rounded-full flex items-center px-4 py-2 hover:bg-[#0F172A]/80 transition-all">
            <Search className="text-[#94A3B8] mr-2" size={18} />
            <input 
              id="search-input"
              name="search"
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-[#94A3B8]/50" 
              placeholder="어디로 갈까요?" 
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <button onClick={() => signIn("google")} className="bg-[#FF6B6B] text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-[#FF6B6B]/20 active:scale-95 transition-all">로그인</button>
      </header>

      {/* Category Chips */}
      <div className="fixed top-[74px] left-0 w-full z-40 overflow-x-auto no-scrollbar py-3 flex items-center gap-2 px-4">
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setSelectedCategoryIds([cat.id])}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
              selectedCategoryIds.includes(cat.id) 
                ? "bg-[#FF6B6B] text-white shadow-lg shadow-[#FF6B6B]/20" 
                : "bg-[#0F172A]/60 backdrop-blur-xl border border-[#1E293B] text-white hover:bg-[#0F172A]/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Unified FAB & Mint Tooltip */}
      <div className="absolute right-4 bottom-[120px] flex flex-col items-end gap-3 z-[100]">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [0, -5, 0] }}
          transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
          className="bg-[#00D09E] text-white text-[12px] font-bold px-4 py-2.5 rounded-2xl shadow-xl relative"
        >
          지금 바로 링크를 공유해보세요!
          <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#00D09E]" />
        </motion.div>
        <button 
          id="add-link-btn"
          onClick={() => setIsModalOpen(true)}
          className="bg-[#FF6B6B] text-white p-4 rounded-full shadow-[0_8px_32px_rgba(255,107,107,0.4)] hover:brightness-110 active:scale-90 transition-all"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      </div>

      {/* Map Controls */}
      <div className="absolute top-[160px] right-4 flex flex-col gap-2 z-40">
        <div className="bg-[#0F172A]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#1E293B] flex flex-col overflow-hidden">
          <button onClick={() => mapInstance?.setLevel(mapInstance.getLevel() - 1)} className="p-3 text-white hover:bg-white/10 border-b border-[#1E293B]"><Plus size={20} /></button>
          <button onClick={() => mapInstance?.setLevel(mapInstance.getLevel() + 1)} className="p-3 text-white hover:bg-white/10"><Minus size={20} /></button>
        </div>
        <button 
          onClick={() => navigator.geolocation.getCurrentPosition(pos => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
          className="bg-[#0F172A]/80 backdrop-blur-xl p-3 rounded-full text-white shadow-2xl border border-[#1E293B] hover:bg-white/10"
        >
          <LocateFixed size={20} />
        </button>
      </div>

      {/* Bottom Sheet */}
      <motion.div 
        className="absolute bottom-0 w-full bg-[#0F172A]/95 backdrop-blur-2xl rounded-t-[24px] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] z-[110] flex flex-col border-t border-[#1E293B]"
        animate={{ height: isBottomSheetMinimized ? '80px' : (selectedPlace ? '75%' : (places.length > 0 ? '50%' : '340px')) }}
        transition={{ type: "spring", damping: 30, stiffness: 150 }}
      >
        <div className="w-full flex justify-center py-4 cursor-pointer" onClick={() => setIsBottomSheetMinimized(!isBottomSheetMinimized)}>
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        
        <div className="px-6 pb-10 overflow-y-auto flex-1 custom-scrollbar">
          {selectedPlace ? (
            <div className="text-white">
              <button onClick={() => setSelectedPlace(null)} className="flex items-center gap-2 text-[#94A3B8] mb-6 hover:text-white transition-colors">
                <ArrowLeft size={18} /> <span className="text-[10px] font-bold uppercase tracking-widest">돌아가기</span>
              </button>
              <h2 className="text-4xl font-bold mb-4 tracking-tight">{selectedPlace.name}</h2>
              <p className="text-sm text-[#94A3B8] mb-8 flex items-center gap-2">
                <Navigation size={14} className="text-[#FF6B6B]" /> {selectedPlace.address}
              </p>
              
              <div className="bg-white/5 p-6 rounded-[24px] mb-8 border-none">
                <p className="text-lg font-medium leading-relaxed italic text-white/90">&quot;{selectedPlace.description}&quot;</p>
              </div>

              {selectedPlace.detailed_highlights && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4 text-[#6B4EFF]">
                    <Sparkles size={18} fill="currentColor" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">AI 포인트</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedPlace.detailed_highlights.split('\n').map((h, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-2xl border-none flex items-start gap-3">
                        <Check size={14} className="text-[#00D09E] mt-1" />
                        <p className="text-sm text-[#94A3B8]">{h.replace(/^[•\s-]+/, '')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <a href={selectedPlace.url} target="_blank" className="bg-white/10 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-white/20 transition-all">
                  <Bookmark size={18} /> 인스타 원본
                </a>
                <a href={`https://map.kakao.com/link/to/${selectedPlace.name},${selectedPlace.lat},${selectedPlace.lng}`} target="_blank" className="bg-[#FF6B6B] text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-[#FF6B6B]/20">
                  <Navigation size={18} /> 길찾기
                </a>
              </div>
            </div>
          ) : places.length > 0 ? (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">{isDemoMode ? "에디터 픽: 성수" : "내 핫플 목록"}</h2>
                <span className="bg-[#FF6B6B]/20 text-[#FF6B6B] px-3 py-1 rounded-full text-[10px] font-bold">{places.length}개</span>
              </div>
              <div className="grid gap-4 pb-12">
                {places.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      setSelectedPlace(p);
                      setMapCenter({ lat: p.lat, lng: p.lng });
                      if (mapInstance) mapInstance.setLevel(3);
                    }}
                    className="flex items-center gap-4 p-5 bg-white/5 rounded-[28px] border border-transparent hover:border-[#FF6B6B]/30 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-black/40 rounded-2xl flex items-center justify-center text-[#FF6B6B] group-hover:bg-[#FF6B6B] group-hover:text-white transition-all">
                      <MapPin size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white truncate">{p.name}</h4>
                      <p className="text-xs text-[#94A3B8] truncate mt-1">{p.address}</p>
                    </div>
                    <ExternalLink size={16} className="text-white/20 group-hover:text-[#FF6B6B] transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center pt-4">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative">
                <div className="absolute inset-0 rounded-full bg-[#FF6B6B]/20 blur-xl"></div>
                <Sparkles size={40} className="text-[#FF6B6B] relative z-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 font-display">인스타 핫플을 가장 쉽게 저장하세요</h2>
              <p className="text-sm text-[#94A3B8] mb-8 leading-relaxed">
                게시물의 [공유하기] 버튼을 눌러 스플로 보내면<br/>AI가 알아서 찾아드려요!
              </p>
              <button onClick={handleToggleDemo} className="w-full max-w-sm bg-[#0F172A] border border-[#FF6B6B]/50 text-white py-4 rounded-2xl font-bold hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-2">
                <span>성수동 에디터 픽 미리보기</span>
                <ArrowLeft size={18} className="rotate-180 text-[#FF6B6B]" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="absolute inset-0 z-[200] flex justify-center items-end bg-black/80 backdrop-blur-md sm:items-center p-4">
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="w-full sm:max-w-md bg-[#0F172A] rounded-[32px] p-8 border border-[#1E293B] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-white tracking-tight font-display italic">AI 자동 분석</h3>
                <button onClick={() => { setIsModalOpen(false); setAnalyzedPlaces([]); }} className="text-[#94A3B8] hover:text-white"><X size={24} /></button>
              </div>
              
              {isLoading ? (
                <div className="py-12 flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#6B4EFF]/20 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                    <Sparkles size={32} className="text-[#6B4EFF]" />
                  </div>
                  <p className="text-white font-bold">AI가 핫플을 분석하고 있어요...</p>
                </div>
              ) : !analyzedPlaces.length ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="url-input" className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest ml-1">인스타그램 링크</label>
                    <div className="relative">
                      <input 
                        id="url-input"
                        name="url"
                        className="w-full bg-white/5 border border-[#1E293B] rounded-2xl px-5 py-4 text-white outline-none focus:border-[#FF6B6B]/50 transition-all"
                        placeholder="https://www.instagram.com/p/..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <button
                        onClick={async () => setUrlInput(await navigator.clipboard.readText())}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
                        title="클립보드에서 붙여넣기"
                      >
                        <ClipboardPaste size={20} />
                      </button>
                    </div>
                  </div>
                  <button onClick={handleAnalyze} className="w-full bg-gradient-to-r from-[#6B4EFF] to-[#8B74FF] text-white py-5 rounded-2xl font-bold shadow-xl shadow-[#6B4EFF]/20 hover:brightness-110 transition-all">
                    AI 분석 시작하기
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pt-2">
                  {!session && (
                    <div className="mb-4 p-4 rounded-2xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF6B6B] flex items-center justify-center shrink-0">
                        <WifiOff size={16} className="text-white" />
                      </div>
                      <p className="text-xs font-bold text-white leading-tight">
                        로그인하지 않았을 때는 위치 정보가 저장되지 않습니다.<br/>
                        <span className="opacity-60 font-medium text-[10px]">지금 로그인하고 나만의 핫플 지도를 완성해보세요!</span>
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-xs font-bold text-[#94A3B8]">{analyzedPlaces.length}개의 장소를 찾았습니다</p>
                    <button 
                      onClick={() => setSelectedAnalyzedIndices(
                        selectedAnalyzedIndices.length === analyzedPlaces.length ? [] : analyzedPlaces.map((_, i) => i)
                      )}
                      className="text-[10px] font-bold text-[#FF6B6B] uppercase tracking-widest"
                    >
                      {selectedAnalyzedIndices.length === analyzedPlaces.length ? "전체 해제" : "전체 선택"}
                    </button>
                  </div>
                  {analyzedPlaces.map((p, i) => (
                    <div 
                      key={i} 
                      className={`p-6 rounded-[28px] border transition-all cursor-pointer ${
                        selectedAnalyzedIndices.includes(i) ? "bg-[#FF6B6B]/10 border-[#FF6B6B]/30" : "bg-white/5 border-white/5"
                      }`}
                      onClick={() => setSelectedAnalyzedIndices(prev => 
                        prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          selectedAnalyzedIndices.includes(i) ? "bg-[#FF6B6B] border-[#FF6B6B]" : "border-[#1E293B]"
                        }`}>
                          {selectedAnalyzedIndices.includes(i) && <Check size={14} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xl font-bold text-white truncate">{p.name}</h5>
                          <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 font-bold uppercase tracking-tight mt-1">
                            <Navigation size={12} /> {p.address}
                          </p>
                          
                          {selectedAnalyzedIndices.includes(i) && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              className="space-y-2 mt-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input 
                                id={`folder-input-${i}`}
                                name={`folder-${i}`}
                                placeholder="폴더 지정 (예: 데이트 코스)" 
                                className="w-full bg-black/30 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-white/10 focus:border-[#FF6B6B]/50 transition-colors text-white"
                                value={folderInputs[i] || ""}
                                onChange={(e) => setFolderInputs(prev => ({...prev, [i]: e.target.value}))}
                              />
                              <textarea 
                                id={`memo-input-${i}`}
                                name={`memo-${i}`}
                                placeholder="개인 메모 (예: 웨이팅 김)" 
                                className="w-full bg-black/30 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-white/10 focus:border-[#FF6B6B]/50 transition-colors resize-none h-20 text-white"
                                value={memoInputs[i] || ""}
                                onChange={(e) => setMemoInputs(prev => ({...prev, [i]: e.target.value}))}
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 sticky bottom-0 bg-[#0F172A]">
                    <button 
                      onClick={session ? handleMultiSave : () => signIn("google")} 
                      className="w-full bg-[#FF6B6B] text-white py-5 rounded-2xl font-bold shadow-xl shadow-[#FF6B6B]/30 active:scale-95 transition-all"
                    >
                      {session 
                        ? `${selectedAnalyzedIndices.length}개의 장소 저장하기` 
                        : "로그인하고 내 지도에 저장"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
