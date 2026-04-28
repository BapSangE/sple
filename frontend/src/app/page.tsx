"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Map, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, X, Loader2, Navigation, Bookmark, ArrowLeft, Search, 
  Coffee, Utensils, Wine, ShoppingBag, Camera, Trees, Hotel, 
  Globe, Sparkles, Check, Map as MapIcon, ExternalLink 
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
}

export default function Home() {
  const { data: session, status } = useSession();

  useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_API_KEY || "",
    libraries: ["services"],
  });

  const [places, setPlaces] = useState<Place[]>([]);
  const [hasFirstPlace, setHasFirstPlace] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedPlaces, setAnalyzedPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 }); // Default: Seoul
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [visiblePlaces, setVisiblePlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
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
        const matchesCategory = selectedCategoryId === "all" || (p.categories && p.categories.includes(selectedCategoryId));
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
  }, [places, mapBounds, selectedCategoryId]);

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
        }
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
    if (status === "loading") return;
    const fetchPlaces = async () => {
      if (!session) {
        setPlaces([]);
        return;
      }
      
      const token = (session as any)?.accessToken;
      // 기존에 로그인되어 있던 세션이지만 백엔드 토큰(accessToken)이 없는 경우 (쿠키 갱신 필요)
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
          signOut();
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
  }, [session, status]);

  const handleAnalyze = async () => {
    if (!urlInput.trim()) return;
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
        setAnalyzedPlaces(data.data);
      } else {
        alert(data.message || "분석에 실패했습니다.");
      }
    } catch (error) {
      alert("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (place: Place) => {
    if (!session) {
      alert("로그인이 필요합니다.");
      signIn("google");
      return;
    }
    
    const token = (session as any)?.accessToken;
    if (!token) {
      alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
      signOut();
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
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/save-place`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({ ...place, url: urlInput, lat, lng, user_email: session?.user?.email }),
      });
      
      if (res.status === 401) {
        alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        signOut();
        return;
      }
      
      const data = await res.json();
      if (data.status === "success") {
        alert(`'${place.name}' 장소가 저장되었습니다!`);
        setPlaces(prev => [{ ...place, id: Date.now().toString(), lat, lng, url: urlInput }, ...prev]);
        setHasFirstPlace(true);
        setIsModalOpen(false);
        setUrlInput("");
        setAnalyzedPlaces([]);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="relative w-full h-full flex justify-center bg-gray-100 sm:items-center sm:py-10">
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
              />
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
          <div className="flex overflow-x-auto px-6 pb-4 no-scrollbar gap-2.5 scroll-smooth">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 ${
                    isActive 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                      : "bg-white/80 text-text-body border-transparent hover:border-gray-200"
                  }`}
                >
                  <Icon size={14} strokeWidth={3} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Map Area */}
        <main className="flex-1 h-full relative z-0">
          <Map
            center={mapCenter}
            style={{ width: "100%", height: "100%" }}
            level={7}
            onIdle={(map) => setMapBounds(map.getBounds())}
          >
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
          </Map>

          <div className="absolute bottom-[260px] right-6 flex flex-col items-end z-40">
            <AnimatePresence>
              {!hasFirstPlace && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: [0, -12, 0], scale: 1 }}
                  transition={{ 
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    opacity: { duration: 0.5 }
                  }}
                  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                  className="bg-gradient-to-br from-tertiary to-[#00B88A] text-white px-7 py-5 rounded-[32px] shadow-2xl shadow-tertiary/30 mb-6 text-sm font-black relative text-center leading-relaxed"
                >
                  인스타에서 공유하기를 눌러<br/>첫 맛집을 추가해 보세요! ✨
                  <div className="absolute -bottom-2 right-8 w-5 h-5 bg-[#00B88A] rotate-45 rounded-sm" />
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-18 h-18 bg-gradient-to-br from-primary via-[#FF6B6B] to-[#FF8589] rounded-[28px] text-white flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 active:scale-90 transition-all border-4 border-white/20"
            >
              <Plus size={40} strokeWidth={3} />
            </button>
          </div>
        </main>

        {/* Bottom Sheet */}
        <motion.div 
          className="absolute bottom-0 w-full bg-white rounded-t-[48px] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] z-50 flex flex-col border-t border-gray-50"
          animate={{ height: selectedPlace ? '75%' : '240px' }}
          transition={{ type: "spring", damping: 30, stiffness: 150 }}
        >
          <div className="w-full flex justify-center py-5 cursor-pointer absolute top-0 z-10" onClick={() => setSelectedPlace(null)}>
            <div className="w-16 h-1.5 bg-gray-200/80 rounded-full" />
          </div>
          
          <div className="px-8 pb-10 overflow-y-auto flex-1 custom-scrollbar pt-10">
            {selectedPlace ? (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                <button 
                  onClick={() => setSelectedPlace(null)} 
                  className="flex items-center gap-2 text-text-body mb-8 hover:text-primary transition-colors group px-1"
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-1.5 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-[0.25em]">탐색기로 돌아가기</span>
                </button>
                <h2 className="text-5xl font-black mb-4 text-text-headline tracking-tighter leading-[0.9]">{selectedPlace.name}</h2>
                <p className="text-sm text-text-body mb-8 font-bold flex items-center gap-1.5 px-1 leading-snug">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                    <Navigation size={12} fill="currentColor" />
                  </div>
                  {selectedPlace.address}
                </p>
                
                <div className="bg-[#F8F9FF] p-7 rounded-[40px] mb-8 border border-indigo-50/50">
                  <p className="text-lg font-bold leading-relaxed text-indigo-900/80 italic">"{selectedPlace.description}"</p>
                </div>

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

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <a 
                    href={`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(selectedPlace.name + ' ' + selectedPlace.address.split(' ').slice(0, 3).join(' '))}`}
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex flex-col items-center justify-center gap-3 py-6 bg-[#03C75A]/5 text-[#03C75A] rounded-[32px] border border-[#03C75A]/10 hover:bg-[#03C75A] hover:text-white transition-all group active:scale-95 shadow-sm"
                  >
                    <div className="w-10 h-10 bg-[#03C75A] text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-md group-hover:bg-white group-hover:text-[#03C75A]">N</div>
                    <span className="text-[11px] font-black uppercase tracking-widest">네이버 지도</span>
                  </a>
                  <a 
                    href={`https://map.kakao.com/link/search/${encodeURIComponent(selectedPlace.name)}`}
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex flex-col items-center justify-center gap-3 py-6 bg-[#FAE100]/10 text-[#3C1E1E] rounded-[32px] border border-[#FAE100]/20 hover:bg-[#FAE100] transition-all group active:scale-95 shadow-sm"
                  >
                    <div className="w-8 h-8 bg-[#FAE100] text-[#3C1E1E] rounded-2xl flex items-center justify-center shadow-md group-hover:bg-white">
                      <MapIcon size={20} fill="currentColor" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">카카오맵</span>
                  </a>
                </div>

                <div className="flex flex-col gap-4 pb-6">
                  <a 
                    href={selectedPlace.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full bg-[#1E1E1E] text-white py-5 rounded-[32px] flex items-center justify-center gap-3 font-black shadow-xl hover:bg-black active:scale-95 transition-all text-lg"
                  >
                    <Bookmark size={22} fill="currentColor" />
                    인스타그램 원본 확인
                  </a>
                  <a 
                    href={`https://map.kakao.com/link/to/${selectedPlace.name},${selectedPlace.lat},${selectedPlace.lng}`}
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full bg-gradient-to-r from-primary to-[#FF8589] text-white py-5 rounded-[32px] flex items-center justify-center gap-3 font-black shadow-xl shadow-primary/30 active:scale-95 transition-all text-lg"
                  >
                    <Navigation size={22} fill="currentColor" />
                    지금 길찾기 시작
                  </a>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-8 px-1">
                  <h2 className="text-3xl font-black text-text-headline tracking-tighter">내 핫플</h2>
                  <div className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-text-body shadow-inner">
                    {visiblePlaces.length} 개의 장소
                  </div>
                </div>

                {!hasFirstPlace ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-20">
                    <Bookmark size={64} strokeWidth={1} className="mb-6" />
                    <p className="font-black tracking-tight text-xl text-center">지도가 비어있습니다.<br/>인스타그램에서 공유해보세요!</p>
                  </div>
                ) : visiblePlaces.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6 text-gray-300">
                      <Navigation size={40} />
                    </div>
                    <p className="font-black text-xl text-gray-400 tracking-tight">이 지역에는 장소가 없습니다.</p>
                    <p className="text-sm text-gray-300 mt-2 font-bold uppercase tracking-widest">지도를 이동해보세요</p>
                  </div>
                ) : (
                  <motion.div 
                    className="flex flex-col gap-5"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.12 }
                      }
                    }}
                  >
                    {visiblePlaces.map(p => (
                      <motion.div 
                        key={p.id} 
                        onClick={() => setSelectedPlace(p)} 
                        variants={{
                          hidden: { opacity: 0, y: 30, scale: 0.9 },
                          show: { opacity: 1, y: 0, scale: 1 }
                        }}
                        whileHover={{ y: -6, backgroundColor: "#FFFFFF", borderColor: "rgba(255, 90, 95, 0.1)" }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-6 p-6 bg-[#F8F9FA] rounded-[44px] cursor-pointer transition-all border-2 border-transparent hover:shadow-2xl shadow-indigo-900/5 group relative overflow-hidden"
                      >
                        <div className="w-16 h-16 bg-white text-primary flex items-center justify-center rounded-[26px] shrink-0 shadow-sm border border-gray-100 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-12 group-hover:shadow-lg shadow-primary/20">
                          {(() => {
                            const mainCatId = p.categories?.[0] || "other";
                            const catInfo = CATEGORIES.find(c => c.id === mainCatId) || CATEGORIES[CATEGORIES.length - 1];
                            const CatIcon = catInfo.icon;
                            return <CatIcon size={28} strokeWidth={2.5} />;
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xl truncate text-text-headline tracking-tight mb-1">{p.name}</h4>
                          <div className="flex items-center gap-1.5 opacity-60">
                            <Navigation size={10} fill="currentColor" />
                            <p className="text-[10px] text-text-body truncate uppercase tracking-[0.2em] font-black">{p.address}</p>
                          </div>
                        </div>
                        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 border border-gray-50">
                          <ExternalLink size={20} className="text-primary" />
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
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
                className="w-full sm:max-w-md bg-white rounded-t-[56px] sm:rounded-[56px] p-10 shadow-2xl flex flex-col max-h-[90vh] border-t border-gray-100"
              >
                <div className="flex justify-between items-center mb-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">새로운 장소</span>
                    <h3 className="text-3xl font-black text-text-headline tracking-tighter italic leading-none">AI 자동 분석</h3>
                  </div>
                  <button onClick={() => { setIsModalOpen(false); setAnalyzedPlaces([]); }} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>
                {!analyzedPlaces.length ? (
                  <>
                    <div className="relative mb-10 group">
                      <textarea 
                        placeholder="인스타 게시물 내용을 이곳에 붙여넣으세요..."
                        className="w-full bg-gray-50/50 p-8 rounded-[40px] min-h-[220px] resize-none outline-none ring-4 ring-transparent focus:ring-primary/5 focus:bg-white transition-all text-base font-bold leading-relaxed border-2 border-gray-100 focus:border-primary/20 placeholder:text-gray-300"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <div className="absolute bottom-6 right-8 text-[10px] font-black text-gray-300 uppercase tracking-widest">입력을 기다리는 중...</div>
                    </div>
                    <button 
                      id="analyze-btn"
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-br from-[#6B4EFF] to-[#8B74FF] text-white py-6 rounded-[32px] font-black flex justify-center items-center gap-3 shadow-2xl shadow-indigo-500/30 hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all text-xl tracking-tight"
                    >
                      {isLoading ? <><Loader2 className="animate-spin" size={28} strokeWidth={3} /> 분석 중...</> : "분석 시작하기"}
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
                            <p className="text-sm text-gray-600 italic leading-relaxed line-clamp-2">"{place.description}"</p>
                          </div>
                          <button 
                            onClick={() => handleSave(place)}
                            className="w-full bg-primary text-white py-4.5 rounded-[24px] text-base font-black shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest py-4"
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
