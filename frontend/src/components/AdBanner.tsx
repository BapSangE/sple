"use client";

import { useEffect } from "react";

interface AdBannerProps {
  dataAdSlot?: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: boolean;
}

export default function AdBanner({
  dataAdSlot,
  dataAdFormat = "auto",
  dataFullWidthResponsive = true,
}: AdBannerProps) {
  const adSlot = dataAdSlot?.trim();
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  const isConfigured = Boolean(
    adClient && adSlot && adSlot !== "1234567890" && /^\d{10}$/.test(adSlot),
  );

  useEffect(() => {
    if (!isConfigured || process.env.NODE_ENV === "development") {
      return;
    }

    try {
      // 컴포넌트가 마운트될 때 구글 광고 스크립트 실행
      // @ts-expect-error adsbygoogle is injected by the AdSense script.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  }, [isConfigured]);

  if (!isConfigured) {
    return null;
  }

  // 개발 환경에서는 광고 영역을 시각적으로 보여줍니다.
  if (process.env.NODE_ENV === "development") {
    return (
      <div className="w-full h-[100px] bg-[#1E293B]/50 border border-[#334155] rounded-xl flex items-center justify-center text-[#94A3B8] text-sm mt-4">
        광고 노출 영역 (개발 환경)
      </div>
    );
  }

  return (
    <div className="w-full mt-4 rounded-xl overflow-hidden min-h-[100px]">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
    </div>
  );
}
