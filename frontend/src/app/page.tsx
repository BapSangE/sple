"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Map, CustomOverlayMap, useKakaoLoader, MarkerClusterer } from "react-kakao-maps-sdk";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { 
  Plus, X, Loader2, Navigation, Bookmark, ArrowLeft, Search, 
  Coffee, Utensils, Wine, ShoppingBag, Camera, Trees, Hotel, 
  Globe, Sparkles, Check, Map as MapIcon, ExternalLink,
  Link as LinkIcon, Play, Minus, LocateFixed, ChevronDown, ChevronUp, WifiOff, ClipboardPaste, MapPin
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "전체", icon: Globe },
  { id: "cafe", label: "카페", icon: Coffee },
  { id: "restaurant", label: "식당", icon: Utensils },
  { id: "bar", label: "술집", icon: Wine },
  { id: "shopping", label: "쇼핑", icon: ShoppingBag },
  { id: "culture", label: "문화", icon: Camera },
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
  const [memoInputs, setMemoInputs] = useState<Record<number, string>>({});
  const [folderInputs, setFolderInputs] = useState<Record<number, string>>({});
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 }); // Default: Seoul
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [visiblePlaces, setVisiblePlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(["all"]);
  
  // Phase 2 & 3 States
  const [isListView, setIsListView] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isMiniFabOpen, setIsMiniFabOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isBottomSheetMinimized, setIsBottomSheetMinimized] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);
  
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

  // Custom Toast State
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

  useEffect(() => {
    const savedHistory = localStorage.getItem("spleSearchHistory");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem("spleSearchHistory", JSON.stringify(newHistory));
    handleSearch(query);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      const token = (session as any)?.accessToken;
      if (token && !isDemoMode) {
        // Fetch all places when query is empty
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
        if (data.data.length > 0 && query) {
          const first = data.data[0];
          if (first.lat && first.lng) {
            setMapCenter({ lat: first.lat, lng: first.lng });
          }
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
          console.warn("Geolocation failed, using fallback", err);
          showToast("위치 권한이 거부되어 기본 위치로 이동합니다.");
          setMapCenter({ lat: 37.5665, lng: 126.9780 });
        },
        { timeout: 5000 }
      );
    }

    const params = new URLSearchParams(window.location.search);
    const sharedUrlParam = params.get('url');
    const sharedTextParam = params.get('text');
    
    let sharedContent = "";
    if (sharedUrlParam && sharedUrlParam.startsWith('http')) {
      sharedContent = sharedUrlParam;
    } else if (sharedTextParam) {
      const match = sharedTextParam.match(/https:\/\/(www\.)?instagram\.com\/[^\s]+/);
      if (match) sharedContent = match[0];
      else sharedContent = sharedTextParam + (sharedUrlParam ? " " + sharedUrlParam : "");
    } else if (sharedUrlParam) {
      sharedContent = sharedUrlParam;
    }

    if (sharedContent) {
      setUrlInput(sharedContent);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        const btn = document.getElementById('analyze-btn');
        if (btn && !btn.hasAttribute('disabled')) btn.click();
      }, 500);
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
        console.warn("세션은 존재하지만 토큰이 없습니다. 재로그인이 필요합니다.");
        signOut();
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/places`, {
          headers: { "Authorization": `Bearer ${token}` },
          credentials: "include"
        });
        
        if (res.status === 401) {
          console.warn("토큰이 만료되었거나 유효하지 않습니다.");
          showToast("세션이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => signOut(), 1500);
          return;
        }
        
        const data = await res.json();
        if (data.status === "success") {
          setPlaces(data.data);
          setHasFirstPlace(data.data.length > 0);
        } else {
          setPlaces([]);
        }
      } catch (err) {
        console.error("Failed to load places", err);
        setPlaces([]);
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

    // 1. 중복 마커 방지 처리
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
      if (!res.ok) {
        if (res.status === 500 || res.status === 429) {
          showToast("서버 연결이 원활하지 않거나 호출 한도를 초과했습니다. 잠시 후 시도해주세요.");
        } else {
          showToast("분석 서버와의 통신에 실패했습니다.");
        }
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      if (data.status === "success") {
        setAnalyzedPlaces(data.data);
      } else {
        showToast(data.message || "분석에 실패했습니다. 올바른 게시물인지 확인해주세요.");
      }
    } catch (error) {
      showToast("서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.");
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
      showToast("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
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
          showToast("📍 지도에서 위치를 찾을 수 없어요. 주소가 정확한지 확인해주세요!");
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

      if (res.status === 401) {
        showToast("인증이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => signOut(), 1500);
        return;
      }

      const data = await res.json();
      if (data.status === "success") {
        showToast(`'${place.name}' 장소가 저장되었습니다!`);
        // If in demo mode, switch back to real mode to see the saved place
        if (isDemoMode) setIsDemoMode(false);
        setPlaces(prev => [{ ...placeToSave, id: Date.now().toString() }, ...prev]);        setHasFirstPlace(true);
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
    <div className="relative w-full h-full flex justify-center bg-gray-100 sm:items-center sm:py-10">
      {/* Toast & Offline Notification */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-2 tracking-tight whitespace-nowrap"
          >
            <WifiOff size={16} />
            네트워크 연결을 확인해주세요
          </motion.div>
        )}
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[200] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold flex items-center gap-2 tracking-tight whitespace-nowrap border border-gray-700/50"
          >
            <Sparkles size={16} className="text-primary" />
            {toastMessage}
          </motion.div>
        )}
        {deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] z-[150] bg-white rounded-2xl shadow-2xl border-2 border-primary/20 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <Sparkles size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-gray-800">Sple 앱 설치하기</span>
                <span className="text-[10px] font-bold text-gray-500">홈 화면에 추가하고 더 빠르게</span>
              </div>
            </div>
            <button
              onClick={() => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult: any) => {
                  if (choiceResult.outcome === 'accepted') {
                    setDeferredPrompt(null);
                  }
                });
              }}
              className="bg-primary text-white px-4 py-2 rounded-full text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              설치
            </button>
            <button onClick={() => setDeferredPrompt(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 border border-gray-100">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full h-full max-w-[430px] sm:h-[90vh] bg-surface sm:rounded-[40px] sm:shadow-2xl sm:border-[8px] sm:border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="absolute top-0 w-full z-50 glass border-b border-white/20 flex flex-col pt-4 shadow-lg shadow-black/5">
          <div className="flex items-center justify-between px-6 mb-4 gap-4">
            <h1 className="font-manrope font-black text-3xl text-primary shrink-0 tracking-tighter italic leading-none">Sple</h1>
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-body group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="어디로 갈까요?" 
                className="w-full bg-white/50 py-2.5 pl-10 pr-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all border border-gray-100 focus:border-primary/30 shadow-inner"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit(searchQuery);
                }}
              />
              {/* Search History Chips */}
              {searchHistory.length > 0 && (
                <div className="absolute top-[110%] left-0 w-full flex flex-wrap gap-2 p-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50">
                  <div className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">최근 검색</div>
                  {searchHistory.map((history, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => { e.preventDefault(); handleSearchSubmit(history); }}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-primary/10 hover:text-primary text-gray-600 rounded-full text-xs font-bold transition-colors shadow-sm"
                    >
                      {history}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0"></div>
            ) : session?.user ? (
              <button onClick={() => signOut()} className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm" title="로그아웃">
                <img src={session.user.image || `https://ui-avatars.com/api/?name=${session.user.name}`} alt="Profile" className="w-full h-full object-cover" />
              </button>
            ) : (
              <button onClick={() => signIn("google")} className="shrink-0 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap hover:bg-primary/20 transition-colors">
                로그인
              </button>
            )}
          </div>
          <div className="relative">
            <div className="flex overflow-x-auto px-6 pb-4 no-scrollbar gap-2.5 scroll-smooth">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategoryIds.includes(cat.id);
                const isDisabled = isDataEmpty;
                
                return (
                  <button
                    key={cat.id}
                    disabled={isDisabled}
                    onClick={() => {
                      if (cat.id === "all") {
                        setSelectedCategoryIds(["all"]);
                      } else {
                        setSelectedCategoryIds(prev => {
                          const newIds = prev.includes(cat.id) 
                            ? prev.filter(id => id !== cat.id)
                            : [...prev.filter(id => id !== "all"), cat.id];
                          return newIds.length === 0 ? ["all"] : newIds;
                        });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 ${
                      isDisabled 
                        ? "opacity-30 pointer-events-none bg-white/80 text-text-body border-transparent"
                        : isActive 
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                          : "bg-white text-gray-700 border-gray-300 hover:border-primary/50 shadow-sm"
                    }`}
                  >
                    <Icon size={14} strokeWidth={3} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {!isDataEmpty && (
              <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#F3F4F6] via-[#F3F4F6]/80 to-transparent pointer-events-none rounded-r-3xl" />
            )}
          </div>
        </header>

        {/* Map Area */}
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
                const CatIcon = catInfo.icon;
                const isSelected = selectedPlace?.id === p.id;

                return p.lat && p.lng && (
                  <CustomOverlayMap key={p.id} position={{ lat: p.lat, lng: p.lng }} yAnchor={1}>
                    <div 
                      className={`marker-pin ${isSelected ? 'marker-selected' : ''}`}
                      onClick={() => setSelectedPlace(p)}
                    >
                      <div className="marker-icon">
                        <CatIcon size={20} strokeWidth={2.5} />
                      </div>
                    </div>
                  </CustomOverlayMap>
                );
              })}
            </MarkerClusterer>
          </Map>

          {/* Map Controls */}
          <div className="absolute top-[100px] right-4 flex flex-col gap-2 z-40">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
              <button 
                onClick={() => mapInstance && mapInstance.setLevel(mapInstance.getLevel() - 1)}
                className="w-11 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => mapInstance && mapInstance.setLevel(mapInstance.getLevel() + 1)}
                className="w-11 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Minus size={20} strokeWidth={2.5} />
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
              className="w-11 h-11 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center text-primary hover:bg-gray-50 active:bg-gray-100 transition-colors mt-1"
            >
              <LocateFixed size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="absolute bottom-[280px] right-6 flex flex-col items-end z-40">
            <AnimatePresence>
              {isMiniFabOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="absolute bottom-24 right-0 bg-white p-4 rounded-[28px] shadow-2xl border border-gray-100 flex flex-col gap-2 w-[220px]"
                >
                  <div className="text-xs font-black text-text-body mb-1 px-2 uppercase tracking-widest opacity-60">인스타 링크 복사하셨나요?</div>
                  <button 
                    onClick={() => { setIsMiniFabOpen(false); setIsModalOpen(true); }}
                    className="w-full text-left px-4 py-4 bg-gray-50 hover:bg-primary/10 hover:text-primary rounded-2xl font-black text-sm transition-colors flex items-center gap-3 group"
                  >
                    <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-primary">
                      <LinkIcon size={16} strokeWidth={3} />
                    </div>
                    분석 시작하기
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsMiniFabOpen(!isMiniFabOpen)}
              className={`w-18 h-18 rounded-[28px] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-white/20 ${
                isMiniFabOpen 
                  ? "bg-gray-800" 
                  : "bg-gradient-to-br from-primary via-[#FF6B6B] to-[#FF8589] shadow-primary/40"
              }`}
            >
              {isMiniFabOpen ? <X size={32} strokeWidth={3} /> : <LinkIcon size={32} strokeWidth={3} />}
            </button>
          </div>
        </main>

        {/* Bottom Sheet */}
        <motion.div 
          className="absolute bottom-0 w-full bg-white rounded-t-[48px] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] z-50 flex flex-col border-t border-gray-50"
          animate={{ height: isBottomSheetMinimized ? '80px' : (isListView && !selectedPlace ? '85%' : (selectedPlace ? '75%' : (isDataEmpty ? '280px' : '220px'))) }}
          transition={{ type: "spring", damping: 30, stiffness: 150 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div 
            className="w-full flex justify-center py-6 cursor-pointer absolute top-0 z-10 group" 
            onClick={() => setIsBottomSheetMinimized(!isBottomSheetMinimized)}
          >
            <div className="w-16 h-1.5 bg-gray-200/80 rounded-full group-hover:bg-gray-300 transition-colors" />
            <div className="absolute right-6 top-5 text-gray-400">
              {isBottomSheetMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          <div className={`px-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] overflow-y-auto flex-1 custom-scrollbar pt-12 ${isBottomSheetMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
            {selectedPlace ? (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                <button 
                  onClick={() => setSelectedPlace(null)} 
                  className="flex items-center gap-2 text-text-body mb-6 hover:text-primary transition-colors group px-1"
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-1.5 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-[0.25em]">탐색기로 돌아가기</span>
                </button>
                {selectedPlace.image_url && (
                  <div className="w-full h-48 rounded-[32px] overflow-hidden mb-6 shadow-md border border-gray-100">
                    <img src={selectedPlace.image_url} alt={selectedPlace.name} className="w-full h-full object-cover" />
                  </div>
                )}
                {selectedPlace.folder && (
                  <div className="inline-block bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3">
                    📁 {selectedPlace.folder}
                  </div>
                )}
                <h2 className="text-5xl font-black mb-4 text-text-headline tracking-tighter leading-[0.9]">{selectedPlace.name}</h2>
                <p className="text-sm text-text-body mb-8 font-bold flex items-center gap-1.5 px-1 leading-snug">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                    <Navigation size={12} fill="currentColor" />
                  </div>
                  {selectedPlace.address}
                </p>
                
                <div className="bg-[#F8F9FF] p-7 rounded-[40px] mb-6 border border-indigo-50/50">
                  <p className="text-lg font-bold leading-relaxed text-indigo-900/80 italic">&quot;{selectedPlace.description}&quot;</p>
                </div>

                {selectedPlace.memo && (
                  <div className="bg-amber-50 p-6 rounded-[32px] mb-8 border border-amber-100/50 flex flex-col gap-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">✍️ 나의 메모</div>
                    <p className="text-sm font-bold text-amber-900/80 whitespace-pre-wrap">{selectedPlace.memo}</p>
                  </div>
                )}

                {selectedPlace.detailed_highlights && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2.5 mb-5 text-secondary px-1">
                      <Sparkles size={20} fill="currentColor" className="animate-pulse" />
                      <h3 className="text-xs font-black uppercase tracking-[0.3em]">AI 요약 포인트</h3>
                    </div>
                    <div className="grid gap-4">
                      {selectedPlace.detailed_highlights.split('\n').filter(line => line.trim()).map((highlight, idx) => (
                        <div key={idx} className="flex items-start gap-4 bg-gray-50/80 p-5 rounded-[28px] border border-gray-100/50">
                          <div className="mt-1 w-6 h-6 bg-secondary text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-secondary/20">
                            <Check size={14} strokeWidth={4} />
                          </div>
                          <p className="text-[15px] font-bold text-gray-700 leading-snug">{highlight.replace(/^[-\*\s•]+/, '')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mb-8">
                  <a 
                    href={`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(selectedPlace.name + ' ' + selectedPlace.address.split(' ').slice(0, 3).join(' '))}`}
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex flex-col items-center justify-center gap-3 py-6 bg-[#03C75A]/5 text-[#03C75A] rounded-[28px] border border-[#03C75A]/10 hover:bg-[#03C75A] hover:text-white transition-all group active:scale-95 shadow-sm"
                  >
                    <div className="w-10 h-10 bg-[#03C75A] text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-md group-hover:bg-white group-hover:text-[#03C75A]">N</div>
                    <span className="text-[10px] font-black uppercase tracking-widest">네이버 지도</span>
                  </a>
                  <a 
                    href={`https://map.kakao.com/link/search/${encodeURIComponent(selectedPlace.name)}`}
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex flex-col items-center justify-center gap-3 py-6 bg-[#FAE100]/10 text-[#3C1E1E] rounded-[28px] border border-[#FAE100]/20 hover:bg-[#FAE100] transition-all group active:scale-95 shadow-sm"
                  >
                    <div className="w-10 h-10 bg-[#FAE100] text-[#3C1E1E] rounded-2xl flex items-center justify-center shadow-md group-hover:bg-white">
                      <MapIcon size={20} fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">카카오맵</span>
                  </a>
                  <a 
                    href={`tmap://route?goalname=${encodeURIComponent(selectedPlace.name)}&goalx=${selectedPlace.lng}&goaly=${selectedPlace.lat}`}
                    onClick={(e) => {
                      // Fallback logic for Tmap
                      setTimeout(() => {
                        window.location.href = "https://tmap.co.kr";
                      }, 1500);
                    }}
                    className="flex flex-col items-center justify-center gap-3 py-6 bg-[#000000]/5 text-[#000000] rounded-[28px] border border-[#000000]/10 hover:bg-[#000000] hover:text-white transition-all group active:scale-95 shadow-sm"
                  >
                    <div className="w-10 h-10 bg-[#000000] text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-md group-hover:bg-white group-hover:text-[#000000]">T</div>
                    <span className="text-[10px] font-black uppercase tracking-widest">티맵</span>
                  </a>
                </div>

                <div className="flex flex-col gap-3 pb-6">
                  <a 
                    href={selectedPlace.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full bg-[#1E1E1E] text-white py-4 rounded-[28px] flex items-center justify-center gap-3 font-black shadow-lg hover:bg-black active:scale-95 transition-all text-base"
                  >
                    <Bookmark size={20} fill="currentColor" />
                    인스타그램 원본 확인
                  </a>
                  <a 
                    href={`https://map.kakao.com/link/to/${selectedPlace.name},${selectedPlace.lat},${selectedPlace.lng}`}
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full bg-gradient-to-r from-primary to-[#FF8589] text-white py-4 rounded-[28px] flex items-center justify-center gap-3 font-black shadow-lg shadow-primary/30 active:scale-95 transition-all text-base"
                  >
                    <Navigation size={20} fill="currentColor" />
                    지금 길찾기 시작
                  </a>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Sple 핫플: ${selectedPlace.name}`,
                          text: `${selectedPlace.name} - ${selectedPlace.description}`,
                          url: window.location.href + `?url=${encodeURIComponent(selectedPlace.url)}`
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href + `?url=${encodeURIComponent(selectedPlace.url)}`);
                        showToast("링크가 복사되었습니다!");
                      }
                    }}
                    className="w-full bg-white text-gray-700 py-4 rounded-[28px] flex items-center justify-center gap-3 font-black shadow-sm border border-gray-200 active:scale-95 transition-all text-base"
                  >
                    <LinkIcon size={20} strokeWidth={2.5} />
                    친구에게 장소 공유하기
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {isDataEmpty ? (
                  <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 relative">
                    {/* Onboarding Tooltip */}
                    <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: [0, -8, 0], opacity: 1 }}
                    transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" }, opacity: { duration: 0.5 } }}
                    className="absolute -top-20 z-[60] bg-secondary text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-lg shadow-secondary/20 flex items-center gap-2"
                    >                      <span>지금 바로 링크를 공유해보세요!</span>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-secondary" />
                    </motion.div>

                    <div className="w-32 h-32 mb-4 relative flex items-center justify-center">
                      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute">
                        <circle cx="50" cy="50" r="45" fill="#F7F8FA" />
                        <path d="M25 45C25 31.1929 36.1929 20 50 20C63.8071 20 75 31.1929 75 45C75 62.5 50 85 50 85C50 85 25 62.5 25 45Z" fill="url(#paint0_linear)" fillOpacity="0.1" />
                        <path d="M50 80C50 80 28 58.75 28 43C28 30.8497 37.8497 21 50 21C62.1503 21 72 30.8497 72 43C72 58.75 50 80 50 80Z" fill="url(#paint1_linear)" />
                        <circle cx="50" cy="40" r="10" fill="white" />
                        <path d="M70 75L80 85" stroke="#00D09E" strokeWidth="4" strokeLinecap="round" />
                        <path d="M20 30L15 25" stroke="#6B4EFF" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="85" cy="35" r="3" fill="#FF5A5F" />
                        <circle cx="20" cy="65" r="4" fill="#00D09E" />
                        <defs>
                          <linearGradient id="paint0_linear" x1="50" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FF5A5F" />
                            <stop offset="1" stopColor="#FF5A5F" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="paint1_linear" x1="28" y1="21" x2="72" y2="80" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FF5A5F" />
                            <stop offset="1" stopColor="#FF8589" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <motion.div 
                        animate={{ y: [0, -5, 0] }} 
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="relative z-10 text-white"
                      >
                        <MapPin size={24} fill="currentColor" strokeWidth={1} className="text-white mt-[-10px]" />
                      </motion.div>
                    </div>
                    <h3 className="font-black text-[22px] tracking-tighter mb-2 text-center text-text-headline leading-tight">
                      인스타 핫플을<br/>가장 쉽게 저장하세요
                    </h3>
                    <p className="text-xs text-text-body text-center mb-6 font-bold">
                      게시물의 [공유하기] 버튼을 눌러<br/>스플로 보내면 AI가 알아서 찾아드려요!
                    </p>
                    
                    <button 
                      onClick={handleToggleDemo}
                      className="text-xs font-black text-[#6B4EFF] bg-indigo-50 px-4 py-2.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-sm mb-2"
                    >
                      <Play size={14} fill="currentColor" />
                      성수동 에디터 픽 미리보기
                    </button>
                  </div>
                ) : visiblePlaces.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-gray-50 rounded-[32px] flex items-center justify-center mb-5 text-gray-300">
                      <Navigation size={32} />
                    </div>
                    <p className="font-black text-lg text-gray-400 tracking-tight mb-1">장소를 찾을 수 없습니다.</p>
                    <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">지도를 넓게 이동해보세요</p>
                    {isDemoMode && (
                      <button 
                        onClick={handleToggleDemo}
                        className="mt-6 text-xs font-black text-primary bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors"
                      >
                        내 지도로 돌아가기
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-6 px-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-text-headline tracking-tighter">
                          {isDemoMode ? '성수동 에디터 픽' : '내 핫플'}
                        </h2>
                        {isDemoMode && <span className="bg-[#6B4EFF]/10 text-[#6B4EFF] px-2 py-1 rounded-md text-[10px] font-black uppercase">Demo</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsListView(!isListView)}
                          className="bg-white border border-gray-100 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-text-body shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                        >
                          {isListView ? <MapIcon size={12} /> : <div className="w-3 h-3 flex flex-col gap-0.5"><div className="w-full h-0.5 bg-current rounded-full"/><div className="w-full h-0.5 bg-current rounded-full"/><div className="w-full h-0.5 bg-current rounded-full"/></div>}
                          {isListView ? '지도 보기' : '목록 보기'}
                        </button>
                        <div className="bg-gray-100 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-text-body shadow-inner">
                          {visiblePlaces.length} 개
                        </div>
                      </div>
                    </div>
                    {isDemoMode && (
                      <button 
                        onClick={handleToggleDemo}
                        className="w-full mb-6 text-xs font-black text-primary bg-primary/10 py-3 rounded-2xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <ArrowLeft size={14} /> 내 지도로 돌아가기
                      </button>
                    )}
                    <motion.div 
                      className="flex flex-col gap-4"
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: { staggerChildren: 0.08 }
                        }
                      }}
                    >
                      {visiblePlaces.map(p => (
                        <motion.div 
                          key={p.id} 
                          onClick={() => setSelectedPlace(p)} 
                          variants={{
                            hidden: { opacity: 0, y: 20, scale: 0.95 },
                            show: { opacity: 1, y: 0, scale: 1 }
                          }}
                          whileHover={{ y: -4, backgroundColor: "#FFFFFF", borderColor: "rgba(255, 90, 95, 0.1)" }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-5 p-5 bg-[#F8F9FA] rounded-[36px] cursor-pointer transition-all border-2 border-transparent hover:shadow-xl shadow-indigo-900/5 group relative overflow-hidden"
                        >
                          <div className="w-14 h-14 bg-white text-primary flex items-center justify-center rounded-[22px] shrink-0 shadow-sm border border-gray-100 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-12 group-hover:shadow-md shadow-primary/20">
                            {(() => {
                              const mainCatId = p.categories?.[0] || "other";
                              const catInfo = CATEGORIES.find(c => c.id === mainCatId) || CATEGORIES[CATEGORIES.length - 1];
                              const CatIcon = catInfo.icon;
                              return <CatIcon size={24} strokeWidth={2.5} />;
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-lg truncate text-text-headline tracking-tight mb-1">{p.name}</h4>
                            <div className="flex items-center gap-1.5 opacity-60">
                              <Navigation size={10} fill="currentColor" />
                              <p className="text-[10px] text-text-body truncate uppercase tracking-[0.2em] font-black">{p.address}</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 border border-gray-50">
                            <ExternalLink size={16} className="text-primary" />
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="absolute inset-0 z-[100] flex justify-center items-end bg-black/60 backdrop-blur-md sm:items-center">
              <motion.div 
                initial={{ y: "100%", scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: "100%", scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full sm:max-w-md bg-white rounded-t-[56px] sm:rounded-[56px] px-10 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] shadow-2xl flex flex-col max-h-[90vh] border-t border-gray-100"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">새로운 장소</span>
                    <h3 className="text-3xl font-black text-text-headline tracking-tighter italic leading-none">AI 자동 분석</h3>
                  </div>
                  <button onClick={() => { setIsModalOpen(false); setAnalyzedPlaces([]); }} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-500">
                    <motion.div 
                      animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} 
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="w-24 h-24 bg-indigo-50 rounded-[36px] flex items-center justify-center mb-8 text-[#6B4EFF] shadow-xl shadow-indigo-500/10 border-2 border-[#6B4EFF]/10"
                    >
                      <Sparkles size={48} strokeWidth={2.5} />
                    </motion.div>
                    <h4 className="text-2xl font-black text-text-headline mb-3 tracking-tight">AI 분석 중</h4>
                    <p className="text-sm font-bold text-text-body text-center leading-relaxed mb-10">
                      핫플의 숨겨진 매력과 위치를<br/>똑똑하게 찾아내고 있어요 ✨
                    </p>
                    
                    <div className="w-full space-y-4">
                      <div className="w-full h-20 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-[24px] animate-pulse bg-[length:200%_100%]" />
                      <div className="w-3/4 h-6 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-full animate-pulse bg-[length:200%_100%]" />
                      <div className="w-1/2 h-6 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-full animate-pulse bg-[length:200%_100%]" />
                    </div>
                  </div>
                ) : !analyzedPlaces.length ? (
                  <>
                    <div className="relative mb-6 group">
                      <label className="block text-xs font-black text-text-body mb-2 uppercase tracking-widest pl-2">인스타그램 링크</label>
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          placeholder="https://www.instagram.com/p/..."
                          className="w-full bg-gray-50/80 px-6 py-5 pr-14 rounded-[24px] outline-none ring-4 ring-transparent focus:ring-primary/10 focus:bg-white transition-all text-sm font-bold text-gray-700 border-2 border-gray-100 focus:border-primary/30"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                        />
                        <button
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              setUrlInput(text);
                            } catch (err) {
                              showToast("클립보드 접근 권한이 거부되었습니다. 링크를 직접 붙여넣어주세요.");
                            }
                          }}
                          className="absolute right-4 text-gray-400 hover:text-primary transition-colors"
                          title="붙여넣기"
                        >
                          <ClipboardPaste size={20} />
                        </button>
                      </div>
                    </div>
                    <button 
                      id="analyze-btn"
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-br from-[#6B4EFF] to-[#8B74FF] text-white py-5 rounded-[28px] font-black flex justify-center items-center gap-3 shadow-2xl shadow-indigo-500/30 hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all text-lg tracking-tight mt-auto"
                    >
                      <Sparkles size={20} fill="currentColor" />
                      AI 분석 시작하기
                    </button>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar flex flex-col pt-2">
                    <p className="font-black text-xs text-text-body opacity-50 uppercase tracking-[0.2em] mb-6 px-1">{analyzedPlaces.length}개의 장소를 찾았습니다</p>
                    <div className="flex flex-col gap-5 mb-8 flex-1 min-h-0">
                      {analyzedPlaces.map((place, idx) => (
                        <div key={idx} className="border-2 border-gray-100/60 p-7 rounded-[40px] bg-white hover:border-primary/20 hover:shadow-2xl transition-all relative group shadow-lg shadow-black/5">
                          <div className="flex justify-between items-start mb-4">
                            <h5 className="font-black text-2xl tracking-tighter leading-none">{place.name}</h5>
                            {place.categories && place.categories.length > 0 && (
                              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-primary/10">
                                {place.categories[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-body mb-5 flex items-start gap-1.5 leading-tight opacity-70 font-bold uppercase tracking-tight">
                            <Navigation size={14} fill="currentColor" className="shrink-0" /> 
                            <span>{place.address}</span>
                          </p>
                          <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100/50">
                            <p className="text-sm text-gray-600 italic leading-relaxed line-clamp-2">&quot;{place.description}&quot;</p>
                          </div>
                          <div className="flex flex-col gap-3 mb-6">
                            <input 
                              type="text" 
                              placeholder="폴더 지정 (예: 데이트 코스)" 
                              className="w-full bg-gray-50 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 transition-colors"
                              value={folderInputs[idx] || ""}
                              onChange={(e) => setFolderInputs(prev => ({...prev, [idx]: e.target.value}))}
                            />
                            <textarea 
                              placeholder="개인 메모 (예: 웨이팅 김)" 
                              className="w-full bg-gray-50 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 transition-colors resize-none h-20"
                              value={memoInputs[idx] || ""}
                              onChange={(e) => setMemoInputs(prev => ({...prev, [idx]: e.target.value}))}
                            />
                          </div>
                          <button 
                            onClick={() => handleSave(place, memoInputs[idx], folderInputs[idx])}
                            className="w-full bg-primary text-white rounded-[24px] text-base font-black shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest py-4"
                          >
                            내 지도에 추가하기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
