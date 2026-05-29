"use client";

import { ExternalLink, Loader2, MapPin, Phone, X } from "lucide-react";

export interface DetailPlace {
  id: number;
  name: string;
  address?: string | null;
  category?: string | null;
  summary?: string | null;
  naver_place_title?: string | null;
  naver_place_url?: string | null;
  naver_category?: string | null;
  naver_description?: string | null;
  naver_telephone?: string | null;
  naver_address?: string | null;
  naver_road_address?: string | null;
  naver_match_status?: string | null;
  naver_enriched_at?: string | null;
}

interface PlaceDetailSheetProps {
  place: DetailPlace | null;
  isLoadingNaver: boolean;
  naverError: string | null;
  onClose: () => void;
}

function getNaverStatusLabel(place: DetailPlace) {
  if (place.naver_match_status === "matched") return "네이버 확인됨";
  if (place.naver_match_status === "low_confidence") return "네이버 후보";
  if (place.naver_match_status === "not_found") return "검색 결과 없음";
  if (place.naver_match_status === "missing_credentials") return "설정 필요";
  if (place.naver_match_status === "api_error") return "조회 실패";
  return "AI 분석";
}

export default function PlaceDetailSheet({
  place,
  isLoadingNaver,
  naverError,
  onClose,
}: PlaceDetailSheetProps) {
  if (!place) return null;

  const displayAddress = place.naver_road_address || place.address || place.naver_address;
  const hasNaverData = Boolean(place.naver_place_title || place.naver_category || place.naver_road_address);

  return (
    <section className="fixed left-4 right-4 bottom-[var(--app-content-bottom-padding)] z-40 max-h-[calc(100dvh-var(--app-top-bar-height)-var(--app-content-bottom-padding)-16px)] overflow-y-auto overscroll-contain rounded-[24px] border border-black/5 bg-white px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.22)] [-webkit-overflow-scrolling:touch]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
              {getNaverStatusLabel(place)}
            </span>
            {isLoadingNaver && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary">
                <Loader2 size={12} className="animate-spin" />
                확인 중
              </span>
            )}
          </div>
          <h2 className="truncate text-xl font-bold text-text-primary">
            {place.naver_place_title || place.name}
          </h2>
          {displayAddress && (
            <p className="mt-1 flex items-start gap-1.5 text-sm leading-relaxed text-text-secondary">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              <span>{displayAddress}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-600 active:scale-95"
          aria-label="상세 닫기"
        >
          <X size={18} />
        </button>
      </div>

      {place.summary && (
        <div className="mb-3 rounded-2xl bg-primary/5 p-3">
          <p className="mb-1 text-xs font-bold text-primary">AI 분석 내용</p>
          <p className="text-sm leading-relaxed text-text-primary">{place.summary}</p>
        </div>
      )}

      <div className="space-y-2 rounded-2xl bg-gray-50 p-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-text-secondary">카테고리</span>
          <span className="text-right font-medium text-text-primary">
            {place.naver_category || place.category || "정보 없음"}
          </span>
        </div>
        {place.naver_description && (
          <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-text-secondary">네이버 설명</span>
            <span className="text-right text-text-primary">{place.naver_description}</span>
          </div>
        )}
        {!hasNaverData && !isLoadingNaver && (
          <p className="text-sm leading-relaxed text-text-secondary">
            네이버 공식 검색 결과를 아직 찾지 못했어요. 저장된 AI 분석 정보는 그대로 사용할 수 있습니다.
          </p>
        )}
        {naverError && (
          <p className="text-sm leading-relaxed text-red-500">{naverError}</p>
        )}
      </div>

      {(place.naver_telephone || place.naver_place_url) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {place.naver_telephone && (
            <a
              href={`tel:${place.naver_telephone}`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-text-primary active:scale-[0.98]"
            >
              <Phone size={16} />
              전화
            </a>
          )}
          {place.naver_place_url && (
            <a
              href={place.naver_place_url}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#03C75A] text-sm font-bold text-white active:scale-[0.98]"
            >
              <ExternalLink size={16} />
              네이버
            </a>
          )}
        </div>
      )}
    </section>
  );
}
