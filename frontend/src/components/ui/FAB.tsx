"use client";
import { ButtonHTMLAttributes } from "react";

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
}

export function FAB({ onClick, className = "", ...props }: FABProps) {
  return (
    <button 
      onClick={onClick}
      className={`fixed bottom-32 right-safe-margin bg-sple-red text-on-primary-container w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(255,107,107,0.4)] flex items-center justify-center z-40 active:scale-90 transition-transform duration-300 ${className}`}
      {...props}
    >
      <span className="material-symbols-outlined text-[28px] font-bold">add</span>
    </button>
  );
}
