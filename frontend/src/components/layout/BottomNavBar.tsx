"use client";
import { useState } from "react";

export function BottomNavBar() {
  const [activeTab, setActiveTab] = useState("map");

  const tabs = [
    { id: "map", icon: "map", label: "Map" },
    { id: "explore", icon: "explore", label: "Explore" },
    { id: "saved", icon: "bookmark", label: "Saved" },
    { id: "profile", icon: "person", label: "Profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 flex justify-around items-center px-4 py-2 bg-glass-bg backdrop-blur-xl rounded-full shadow-lg border border-outline/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-300 ${
            activeTab === tab.id
              ? "bg-primary-container text-on-primary-container scale-110 shadow-sm"
              : "text-on-surface-variant hover:bg-white/10 active:scale-95"
          }`}
        >
          <span className={`material-symbols-outlined ${activeTab === tab.id ? "fill" : ""}`}>
            {tab.icon}
          </span>
          <span className={`font-label-sm text-label-sm mt-1 ${activeTab === tab.id ? "sr-only" : ""}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
