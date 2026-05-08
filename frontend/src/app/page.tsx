"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Place {
  name: string;
  address: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleExtract = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setPlaces([]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      
      if (data.status === "success" && data.data && data.data.length > 0) {
        setPlaces(data.data);
      } else {
        // 장소가 아닐 경우 팝업 트리거
        setErrorTitle("장소를 찾을 수 없어요 😢");
        setErrorMessage("해당 게시물에서 방문 가능한 장소 정보를 찾지 못했습니다. 장소 정보가 포함된 다른 링크로 시도해 주세요.");
        setIsErrorModalOpen(true);
      }
    } catch {
      setErrorTitle("연결 오류");
      setErrorMessage("서버와 통신하는 중 문제가 발생했습니다. 네트워크 상태를 확인해 주세요.");
      setIsErrorModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getNaverMapUrl = (place: Place) => {
    const query = encodeURIComponent(`${place.address} ${place.name}`);
    return `https://m.map.naver.com/search2/search.naver?query=${query}`;
  };

  return (
    <main className="min-h-screen bg-[#1c1010] text-[#f5dddb] font-sans flex flex-col items-center justify-center p-6 relative">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-[#FF6B6B] tracking-tight">Sple</h1>
          <p className="text-[#e0bfbd] text-sm">인스타 링크 한 줄로, 가장 빠른 장소 저장</p>
        </div>

        {/* Input Section */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="인스타그램 링크를 붙여넣으세요"
              className="w-full bg-[#251818] border border-[#584140] rounded-2xl py-4 px-5 text-white placeholder-[#a78a88] focus:outline-none focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] transition-all"
            />
          </div>
          <button
            onClick={handleExtract}
            disabled={isLoading || !url.trim()}
            className="w-full bg-[#FF6B6B] text-[#6d0010] font-bold py-4 rounded-2xl shadow-[0_4px_20px_rgba(255,107,107,0.3)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? "AI 분석 중..." : "장소 추출하기"}
          </button>
        </div>

        {/* Status / Results Section */}
        <div className="min-h-[200px]">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <div className="w-12 h-12 border-4 border-[#6B4EFF]/30 border-t-[#6B4EFF] rounded-full animate-spin"></div>
                <p className="text-[#6B4EFF] font-medium animate-pulse">텍스트를 분석하여 장소를 찾고 있습니다</p>
              </motion.div>
            )}

            {!isLoading && places.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-[#00D09E] font-medium text-center">🎉 {places.length}개의 장소를 찾았습니다</p>
                {places.map((place, idx) => (
                  <div key={idx} className="bg-[#291c1c] border border-[#403130] rounded-2xl p-5 shadow-lg flex flex-col gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{place.name}</h3>
                      <p className="text-sm text-[#e0bfbd]">{place.address}</p>
                    </div>
                    <a
                      href={getNaverMapUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#03C75A] text-white font-bold py-3 rounded-xl text-center hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12.4452 7.02534C13.1848 7.45266 13.1848 8.54734 12.4452 8.97466L4.54518 13.5381C3.80554 13.9655 2.88098 13.4181 2.88098 12.5635L2.88098 3.43653C2.88098 2.58189 3.80554 2.03454 4.54518 2.46186L12.4452 7.02534Z" fill="white"/>
                      </svg>
                      네이버 지도로 바로보기
                    </a>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Error Modal Popup */}
      <AnimatePresence>
        {isErrorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsErrorModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#291c1c] border border-[#584140] rounded-3xl p-8 shadow-2xl flex flex-col gap-6 text-center"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">{errorTitle}</h3>
                <p className="text-[#e0bfbd] text-sm leading-relaxed">{errorMessage}</p>
              </div>
              <button
                onClick={() => setIsErrorModalOpen(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
              >
                확인
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
