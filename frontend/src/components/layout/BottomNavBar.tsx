"use client";

import { usePathname, useRouter } from "next/navigation";
import { Map, PlusCircle, List, User } from "lucide-react";

export default function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "지도", path: "/", icon: Map },
    { name: "등록", path: "/add", icon: PlusCircle },
    { name: "리스트", path: "/saved", icon: List },
    { name: "프로필", path: "/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <nav className="bg-[var(--color-nav-bg)] rounded-[1000px] shadow-lg w-full max-w-[350px] p-2 flex justify-between items-center h-[62px]">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`flex items-center justify-center flex-1 h-full rounded-full transition-all duration-300 ${
                isActive ? "bg-white/10" : "hover:bg-white/5"
              }`}
              aria-label={item.name}
            >
              <Icon
                size={26}
                className={isActive ? "text-primary" : "text-white/70"}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
