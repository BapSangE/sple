"use client";
import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-overlay-dim z-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-glass-bg backdrop-blur-xl border border-outline-variant/30 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-outline-variant/20 shrink-0">
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-variant/40 transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto hide-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
}
