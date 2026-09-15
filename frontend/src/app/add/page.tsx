"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import AdBanner from "@/components/AdBanner";
import { apiUrl } from "@/lib/api";
import { normalizeAnalyzedPlace } from "@/lib/analyzed-place";
import {
  geocodeAddress,
  geocodingFieldsFromCoordinates,
  pendingGeocodingFields,
} from "@/lib/naver-geocoding";

import { applySaveResults, DRAFT_KEY, readDraft, type SaveCandidate } from "@/lib/place-draft";

type Place = SaveCandidate;

interface AnalyzeResponse {
  status: string;
  data?: Array<Partial<Pick<Place, "name" | "address" | "category" | "summary">>> | null;
  message?: string;
}

interface ApiErrorResponse {
  message?: string;
  code?: string;
  detail?: {
    message?: string;
    code?: string;
  };
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return data.message || data.detail?.message || "장소 저장에 실패했습니다.";
  } catch {
    return "장소 저장에 실패했습니다.";
  }
}

export default function AddPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id || null;
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "loading" | "result">("input");

  const [draftReady, setDraftReady] = useState(false);
  const [draftOwner, setDraftOwner] = useState<string | null | undefined>(undefined);
  const saveInFlight = useRef(false);
  const discardDraft = useRef(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    try {
      const draft = readDraft(sessionStorage.getItem(DRAFT_KEY));
      if (draft && (!draft.userId || draft.userId === userId)) {
        // Restore browser-only state after hydration and session resolution.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUrl(draft.text);
        setPlaces(draft.places);
        setStep(draft.places.length ? "result" : "input");
      } else {
        sessionStorage.removeItem(DRAFT_KEY);
        setUrl("");
        setPlaces([]);
        setStep("input");
      }
    } catch {
      // Never retain another account's draft when storage is unavailable.
      setUrl("");
      setPlaces([]);
      setStep("input");
    }
    setDraftOwner(userId);
    setDraftReady(true);
  }, [sessionStatus, userId]);

  useEffect(() => {
    if (!draftReady || sessionStatus === "loading" || discardDraft.current || draftOwner !== userId) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        text: url, places, userId, updatedAt: Date.now(),
      }));
    } catch {
      // A login attempt explicitly checks persistence before navigating.
    }
  }, [draftReady, draftOwner, sessionStatus, url, places, userId]);

  const handleExtract = async () => {
    if (!url.trim() || isLoading) return;
    setIsLoading(true);
    setStep("loading");
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: url.trim() }),
        signal: AbortSignal.timeout(35_000),
      });
      const data = (await res.json()) as AnalyzeResponse;

      if (!res.ok) {
        setError(data.message || (data as ApiErrorResponse).detail?.message || "장소 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setStep("input");
        return;
      }

      if (data.status === "success" && data.data && data.data.length > 0) {
        const extractedPlaces = data.data
          .map(normalizeAnalyzedPlace)
          .filter((place) => place !== null)
          .map((place) => ({ ...place, request_id: crypto.randomUUID(), saved: false }));

        if (extractedPlaces.length > 0) {
          setPlaces(extractedPlaces);
          setStep("result");
        } else {
          setError("장소명을 찾지 못했어요. 매장명이 포함된 텍스트로 다시 시도해 주세요.");
          setStep("input");
        }
      } else {
        setError("장소 정보를 찾지 못했어요. 상호명이 본문에 있는 다른 텍스트로 다시 시도해 주세요.");
        setStep("input");
      }
    } catch {
      setError("서버 연결에 실패했습니다.");
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlace = (index: number) => {
    if (saveInFlight.current) return;
    setPlaces((currentPlaces) =>
      currentPlaces.map((place, placeIndex) =>
        placeIndex === index && !place.saved ? { ...place, selected: !place.selected } : place,
      ),
    );
  };

  const handleNaverMap = (event: React.MouseEvent, place: Place) => {
    event.stopPropagation();
    if (!place.address) return;

    const query = encodeURIComponent(`${place.name} ${place.address}`);
    window.open(`https://m.map.naver.com/search2/search.naver?query=${query}`, "_blank");
  };

  const handleSave = async () => {
    if (saveInFlight.current || !draftReady || draftOwner !== userId || sessionStatus === "loading") return;
    const selectedPlaces = places.filter(place => place.selected && !place.saved);
    if (!selectedPlaces.length) return;

    if (!userId) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          text: url, places, userId: null, updatedAt: Date.now(),
        }));
      } catch {
        alert("분석 결과를 보관하지 못했습니다. 브라우저 저장소를 허용한 뒤 로그인해 주세요.");
        return;
      }
      await signIn("google", { callbackUrl: "/add" });
      return;
    }

    saveInFlight.current = true;
    setIsSaving(true);
    try {
      const results = await Promise.allSettled(selectedPlaces.map(async place => {
        const coordinates = place.address ? await geocodeAddress(place.address) : null;
        const response = await fetch(apiUrl("/api/places"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: place.request_id,
            name: place.name, address: place.address || "",
            category: place.category, summary: place.summary,
            ...(place.address ? geocodingFieldsFromCoordinates(coordinates) : pendingGeocodingFields()),
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new Error(await readErrorMessage(response));
        const result = await response.json();
        if (result.status !== "success" || !result.data?.id) throw new Error("저장 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
        return place.request_id;
      }));
      const successfulIds = new Set(results.flatMap(result => result.status === "fulfilled" ? [result.value] : []));
      const nextPlaces = applySaveResults(places, successfulIds);
      setPlaces(nextPlaces);
      const failed = results.filter(result => result.status === "rejected");
      if (failed.length) {
        const reason = failed[0].reason;
        alert(`${successfulIds.size}개 저장 완료, ${failed.length}개 저장 실패. 실패한 장소만 다시 저장할 수 있습니다.\n${reason instanceof Error ? reason.message : "다시 시도해 주세요."}`);
      } else {
        discardDraft.current = true;
        try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* optional storage */ }
        alert(`${successfulIds.size}개의 장소가 저장되었습니다!`);
        router.push("/saved");
      }
    } finally {
      saveInFlight.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden px-6 pt-[72px] pb-[80px]">
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="my-auto flex w-full max-w-sm flex-col gap-6 self-center"
          >
            <div className="text-center mt-10 mb-4">
              <h2 className="text-2xl font-bold text-text-primary mb-2">장소 추출하기</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                인스타그램 캡션이나 맛집 소개 글을
                <br />
                복사해서 붙여넣어 주세요
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <textarea
                disabled={!draftReady || draftOwner !== userId || sessionStatus === "loading"}
                value={url}
                maxLength={10_000}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="어니언 성수, 서울 성동구 아차산로9길 8..."
                className="w-full h-32 p-4 text-base bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 shadow-sm resize-none"
              />

              <button
                onClick={handleExtract}
                disabled={!draftReady || isLoading || !url.trim()}
                className="w-full h-[52px] flex items-center justify-center gap-2 bg-primary text-white rounded-xl text-[16px] font-bold transition-all active:scale-[0.98] shadow-[0_8px_16px_rgba(255,90,95,0.25)] disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:active:scale-100"
              >
                {isLoading ? "분석 중..." : "AI 분석하기"}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 text-sm">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-8 w-full"
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
              <p className="text-text-secondary text-sm">잠시만 기다려 주세요...</p>
            </div>
          </motion.div>
        )}

        {step === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col py-6"
          >
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-1">장소 추천</h2>
                <p className="text-text-secondary text-sm">원하는 장소를 체크해서 저장해 보세요.</p>
              </div>
              <button
                onClick={() => setStep("input")}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar pr-1 pb-4">
              {places.map((place, index) => (
                <div
                  key={place.request_id}
                  onClick={() => togglePlace(index)}
                  className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border ${
                    place.selected
                      ? "bg-white border-primary shadow-sm"
                      : "bg-gray-50 border-transparent opacity-60"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      place.selected ? "bg-primary text-white" : "bg-gray-200"
                    }`}
                  >
                    {place.selected && <Check size={16} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className={`font-bold truncate ${place.selected ? "text-text-primary" : "text-gray-600"}`}>
                      {place.name}{place.saved ? " · 저장 완료" : ""}
                    </h3>
                    <p className="text-xs text-text-secondary truncate mt-1">
                      {place.address || "주소 정보 없음"}
                    </p>
                    {(place.category || place.summary) && (
                      <div className="mt-2 flex flex-col gap-1">
                        {place.category && (
                          <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                            {place.category}
                          </span>
                        )}
                        {place.summary && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-text-primary/75">
                            {place.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(event) => handleNaverMap(event, place)}
                    disabled={!place.address}
                    className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors shrink-0 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
                    title={place.address ? "네이버 지도로 보기" : "주소가 없어 지도로 볼 수 없습니다"}
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              ))}

              <AdBanner dataAdSlot="1234567890" />
            </div>

            <div className="shrink-0 border-t border-black/5 bg-background/95 pt-3 pb-2">
              <button
                onClick={handleSave}
                disabled={!draftReady || sessionStatus === "loading" || isSaving || !places.some(place => place.selected && !place.saved)}
                className="w-full h-[52px] flex items-center justify-center bg-primary text-white rounded-xl text-[16px] font-bold active:scale-[0.98] shadow-[0_8px_16px_rgba(255,90,95,0.25)] disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:active:scale-100"
              >
                {isSaving ? "저장 중..." : !userId ? "로그인하고 저장 이어하기" : `선택 저장 (${places.filter((place) => place.selected && !place.saved).length})`}
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
