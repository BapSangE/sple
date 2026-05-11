"use client";

import Image from "next/image";

export default function TopAppBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-[69px] bg-white shadow-[0px_6px_15px_0px_rgba(0,0,0,0.1)]">
      <div className="relative h-[31px] w-[81px]">
        <Image 
          src="/sple_logo.svg" 
          alt="Sple Logo" 
          fill 
          className="object-contain" 
          priority 
        />
      </div>
    </header>
  );
}
