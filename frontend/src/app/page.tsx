"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdBanner from "@/components/AdBanner";

interface Place {
  name: string;
  address: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    setPlaces([]);
    setShowSheet(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      
      if (data.status === "success" && data.data && data.data.length > 0) {
        setPlaces(data.data);
        setShowSheet(true);
      } else {
        setError("앗! 장소 정보를 찾지 못했어요. 상호명이 본문에 적힌 다른 링크로 시도해 주세요! 📍");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const getNaverMapUrl = (place: Place) => {
    const query = encodeURIComponent(`${place.address} ${place.name}`);
    return `https://m.map.naver.com/search2/search.naver?query=${query}`;
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-6 font-sans">
      
      {/* 로고 영역 */}
      <div className="flex items-center justify-center mb-[16px]">
        <svg width="163" height="63" viewBox="0 0 163 63" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[180px] h-auto">
          <path d="M143.776 12.8028V21.4482H160.738V32.6496H143.776V42.1972H163V54H129V1H163V12.8028H143.776Z" fill="black"/>
          <path d="M108.641 42.7234H125V54H94V1H108.641V42.7234Z" fill="black"/>
          <path d="M21.3945 55C15.2818 55 10.2624 53.5293 6.33636 50.5878C2.4103 47.5957 0.298182 43.3356 0 37.8077H15.58C15.7291 39.6842 16.2758 41.0535 17.22 41.9156C18.1642 42.7778 19.3818 43.2088 20.8727 43.2088C22.2145 43.2088 23.3079 42.8792 24.1527 42.2199C25.0473 41.5099 25.4945 40.5463 25.4945 39.3292C25.4945 37.757 24.7739 36.5399 23.3327 35.6777C21.8915 34.8156 19.5558 33.852 16.3255 32.787C12.8964 31.6206 10.1133 30.5048 7.97636 29.4398C5.88909 28.3241 4.0503 26.7266 2.46 24.6473C0.919394 22.5173 0.149091 19.7533 0.149091 16.3555C0.149091 12.9069 0.993939 9.96542 2.68364 7.53112C4.37333 5.04611 6.70909 3.16966 9.69091 1.9018C12.6727 0.633933 16.0521 0 19.8291 0C25.9418 0 30.8121 1.47072 34.44 4.41217C38.1176 7.3029 40.0806 11.3854 40.3291 16.6598H24.4509C24.4012 15.0369 23.9042 13.8197 22.96 13.0083C22.0655 12.1969 20.8976 11.7911 19.4564 11.7911C18.363 11.7911 17.4685 12.1208 16.7727 12.7801C16.077 13.4394 15.7291 14.3776 15.7291 15.5947C15.7291 16.609 16.1018 17.4965 16.8473 18.2573C17.6424 18.9673 18.6115 19.6012 19.7545 20.1591C20.8976 20.6662 22.5873 21.3255 24.8236 22.1369C28.1533 23.3034 30.8867 24.4698 33.0236 25.6362C35.2103 26.752 37.0739 28.3495 38.6145 30.4288C40.2048 32.4574 41 35.0438 41 38.1881C41 41.3831 40.2048 44.2485 38.6145 46.7842C37.0739 49.32 34.8127 51.3232 31.8309 52.7939C28.8988 54.2646 25.42 55 21.3945 55Z" fill="black"/>
          <path d="M69.4854 1C73.7588 1 77.3794 1.75442 80.3457 3.2627C83.362 4.77094 85.6246 6.85704 87.1328 9.52148C88.6411 12.1861 89.3945 15.2536 89.3945 18.7227C89.3945 21.9402 88.641 24.8814 87.1328 27.5459C85.6748 30.1602 83.4374 32.272 80.4209 33.8809C77.4546 35.4394 73.8091 36.2188 69.4854 36.2188H62.1709V41.7949H47.3896V1H69.4854ZM62.1709 24.4541H68.0527C72.2255 24.4541 74.3124 22.5434 74.3125 18.7227C74.3125 14.8514 72.2256 12.915 68.0527 12.915H62.1709V24.4541Z" fill="black"/>
          <path d="M47.3896 62.1074V43.2539H62.1189V62.1074L54.7543 58.9651L47.3896 62.1074Z" fill="#FF8D50"/>
        </svg>
      </div>

      {/* 텍스트 영역 */}
      <div className="text-center mb-[50px]">
        <p className="text-gray-900 text-[16px] font-normal tracking-tight mb-1 leading-tight">
          인스타그램 <span className="font-bold">링크 한 줄</span>로
        </p>
        <p className="text-gray-900 text-[16px] font-medium tracking-tight leading-tight">
          가장 빠른 장소 저장
        </p>
      </div>

      {/* 입력 및 버튼 폼 영역 */}
      <div className="w-[292px] flex flex-col gap-3 z-10">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="게시물 링크 붙여넣기"
          className="w-full h-[48px] px-5 text-base text-gray-800 bg-[#F1F1F1] border border-[#FF8747] rounded-[16px] focus:outline-none focus:ring-[1px] focus:ring-[#FF8747] placeholder-gray-900/50"
        />

        <button 
          onClick={handleExtract}
          disabled={isLoading || !url.trim()}
          className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#FF6B1B] text-white rounded-[16px] text-[16px] font-medium hover:bg-[#E55A12] transition-all active:scale-[0.97] shadow-sm disabled:bg-[#FF8746] disabled:text-white/80 disabled:active:scale-100 disabled:hover:bg-[#FF8746] disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? "장소 추출 중..." : "장소 추출하기"}
          {!isLoading && (
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 384 512"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z" />
            </svg>
          )}
        </button>
      </div>

      {/* 에러 메시지 */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-center text-red-600 text-sm max-w-[292px]"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 바텀 시트 (결과창) - 라이트 모드 디자인 적용 */}
      <AnimatePresence>
        {showSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            
            {/* Sheet Content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[24px] z-50 px-6 pb-10 pt-4"
            >
              {/* Grabber bar */}
              <div className="w-full flex justify-center mb-6">
                <div className="w-[40px] h-[5px] bg-gray-300 rounded-full" />
              </div>

              <div className="mb-6">
                <h2 className="text-gray-900 text-[20px] font-bold mb-1">장소 정보를 확인해 주세요!</h2>
                <p className="text-gray-500 text-sm">추출된 장소 중 이동할 곳을 선택하세요.</p>
              </div>

              <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                {places.map((place, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-5 bg-white border border-[#FF8246]/30 shadow-sm rounded-2xl flex flex-col gap-3 group hover:border-[#FF6B1B] transition-all"
                  >
                    <div>
                      <h3 className="text-gray-900 text-lg font-bold group-hover:text-[#FF6B1B] transition-colors">{place.name}</h3>
                      <p className="text-gray-600 text-sm mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {place.address}
                      </p>
                    </div>
                    
                    <a
                      href={getNaverMapUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-[48px] bg-[#03C75A] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all text-sm"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                      </svg>
                      네이버 지도로 확인하기
                    </a>
                  </motion.div>
                ))}
              </div>

              {/* 스폰서 광고 (개발 환경에서는 플레이스홀더로 보임) */}
              <div className="min-h-[100px] w-full">
                <AdBanner dataAdSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID || ""} />
              </div>
              
              <button 
                onClick={() => setShowSheet(false)}
                className="w-full mt-2 py-4 text-gray-500 font-medium text-sm hover:text-gray-800 transition-colors"
              >
                닫기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
      `}</style>
    </main>
  );
}
