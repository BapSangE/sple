"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNavBar() {
  const pathname = usePathname();

  const tabs = [
    { id: "map", icon: "map", label: "Map", href: "/" },
    { id: "explore", icon: "explore", label: "Explore", href: "/" },
    { id: "saved", icon: "bookmark", label: "Saved", href: "/" },
    { id: "profile", icon: "person", label: "Profile", href: "/profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 flex justify-around items-center px-4 py-2 bg-glass-bg backdrop-blur-xl rounded-full shadow-lg border border-outline/10">
      {tabs.map((tab) => {
        // Determine active state based on pathname
        // Since explore and saved don't have dedicated pages yet, we treat '/' as map primarily.
        // For a more accurate state, we'd check if pathname matches tab.href exactly.
        const isActive = tab.id === "profile" ? pathname === "/profile" : (pathname === "/" && tab.id === "map");
        
        return (
          <Link
            href={tab.href}
            key={tab.id}
            className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-300 ${
              isActive
                ? "bg-primary-container text-on-primary-container scale-110 shadow-sm"
                : "text-on-surface-variant hover:bg-white/10 active:scale-95"
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? "fill" : ""}`}>
              {tab.icon}
            </span>
            <span className={`font-label-sm text-label-sm mt-1 ${isActive ? "sr-only" : ""}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
