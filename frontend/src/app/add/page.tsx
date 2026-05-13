"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdBanner from "@/components/AdBanner";
import { Map as MapIcon, ExternalLink } from "lucide-react";

// TODO: 타입 정의는 분리하는 것이 좋습니다.
interface Place {
  name: string;
  address: string;
  selected?: boolean;
}

export default function AddPage() {
  const { data: session } = useSession();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  
  const router = useRouter();

  const handleExtract = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setStep("loading");
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      
      if (data.status === "success" && data.data && data.data.length > 0) {
        // 모든 가게를 기본적으로 선택된 상태로 설정
        const extractedPlaces = data.data.map((p: any) => ({ ...p, selected: true }));
        setPlaces(extractedPlaces);
        setStep("result");
      } else {
        setError("앗! 장소 정보를 찾지 못했어요. 상호명이 본문에 적힌 다른 링크로 시도해 주세요! 📍");
        setStep("input");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlace = (index: number) => {
    const newPlaces = [...places];
    newPlaces[index].selected = !newPlaces[index].selected;
    setPlaces(newPlaces);
  };

  const handleNaverMap = (e: React.MouseEvent, place: Place) => {
    e.stopPropagation(); // 카드 클릭(체크박스 토글) 방지
    const query = encodeURIComponent(`${place.name} ${place.address}`);
    window.open(`https://m.map.naver.com/search2/search.naver?query=${query}`, "_blank");
  };

  const handleSave = async () => {
    const selectedPlaces = places.filter(p => p.selected);
    if (selectedPlaces.length === 0) {
      alert("최소 한 개의 장소를 선택해주세요.");
      return;
    }

    if (!session?.user || !(session.user as any).id) {
      alert("로그인이 필요합니다. 프로필 탭에서 로그인해주세요.");
      return;
    }

    const userId = (session.user as any).id;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    try {
      // 선택된 장소들을 각각 서버에 저장
      await Promise.all(
        selectedPlaces.map(place => 
          fetch(`${apiUrl}/api/places`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              name: place.name,
              address: place.address,
            }),
          })
        )
      );

      alert(`${selectedPlaces.length}개의 장소가 저장되었습니다!`);
      router.push("/saved"); // 리스트 화면으로 이동
    } catch (error) {
      console.error("저장 중 오류 발생:", error);
      alert("장소 저장에 실패했습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 pt-[72px] pb-[80px]">
      
      {/* Step 1: Input */}
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div 
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm flex flex-col gap-6"
          >
            <div className="text-center mt-10 mb-4">
              <h2 className="text-2xl font-bold text-text-primary mb-2">장소 추출하기</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                인스타그램 게시물 링크나<br/>맛집 정보 텍스트를 붙여넣어주세요!
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <textarea
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="이곳에 붙여넣기"
                className="w-full h-32 p-4 text-base bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 shadow-sm resize-none"
              />

              <button 
                onClick={handleExtract}
                disabled={!url.trim()}
                className="w-full h-[52px] flex items-center justify-center gap-2 bg-primary text-white rounded-xl text-[16px] font-bold transition-all active:scale-[0.98] shadow-[0_8px_16px_rgba(255,90,95,0.25)] disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:active:scale-100"
              >
                AI 분석하기
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 text-sm">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Loading (AI Visualizer) */}
        {step === "loading" && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-8 w-full"
          >
            <div className="relative w-40 h-40 flex items-center justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute inset-0 rounded-full border-[4px] border-secondary/20 border-t-secondary border-r-secondary"
              />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined fill text-3xl">psychiatry</span>
              </motion.div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-text-primary mb-2">AI가 장소를 추출하는 중이에요!</h3>
              <p className="text-text-secondary text-sm">잠시만 기다려주세요...</p>
            </div>
          </motion.div>
        )}

        {/* Step 3: Result (Checklist) */}
        {step === "result" && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm flex flex-col h-full py-6"
          >
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-1">장소 추천</h2>
                <p className="text-text-secondary text-sm">원하는 장소를 체크해서 저장해보세요.</p>
              </div>
              <button onClick={() => setStep("input")} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar pr-1 pb-4">
              {places.map((place, idx) => (
                <div 
                  key={idx}
                  onClick={() => togglePlace(idx)}
                  className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border ${
                    place.selected 
                      ? "bg-white border-primary shadow-sm" 
                      : "bg-gray-50 border-transparent opacity-60"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    place.selected ? "bg-primary text-white" : "bg-gray-200"
                  }`}>
                    {place.selected && <Check size={16} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className={`font-bold truncate ${place.selected ? "text-text-primary" : "text-gray-600"}`}>
                      {place.name}
                    </h3>
                    <p className="text-xs text-text-secondary truncate mt-1">
                      {place.address}
                    </p>
                  </div>
                  
                  {/* 네이버 지도 바로가기 버튼 */}
                  <button
                    onClick={(e) => handleNaverMap(e, place)}
                    className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors shrink-0"
                    title="네이버 지도로 보기"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              ))}
              
              {/* 바텀 시트 내 광고 배너 추가 */}
              <AdBanner dataAdSlot="1234567890" />
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSave}
                className="w-full h-[52px] flex items-center justify-center bg-primary text-white rounded-xl text-[16px] font-bold active:scale-[0.98] shadow-[0_8px_16px_rgba(255,90,95,0.25)]"
              >
                모두 저장 ({places.filter(p => p.selected).length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
