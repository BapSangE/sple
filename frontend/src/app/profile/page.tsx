"use client";

import { useSession, signOut } from "next-auth/react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="bg-background text-on-surface font-body-md antialiased min-h-screen pb-32">
      {/* Top App Bar */}
      <TopAppBar 
        onMenuClick={() => router.push("/")}
        onProfileClick={() => signOut()}
      />

      {/* Main Canvas Content */}
      <main className="pt-28 px-safe-margin max-w-2xl mx-auto space-y-stack-lg">
        
        {/* Profile Header Glassmorphism */}
        <section className="bg-surface-container-low/60 backdrop-blur-md rounded-3xl p-stack-lg shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-sple-red/10 to-transparent pointer-events-none" />
          <div className="relative w-24 h-24 mb-stack-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={session?.user?.image || "https://lh3.googleusercontent.com/a/default-user"} 
              alt="User Profile" 
              className="w-full h-full rounded-full border-4 border-surface object-cover shadow-lg relative z-10" 
            />
            <div className="absolute inset-0 bg-sple-red rounded-full blur-xl opacity-30" />
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-1">{session?.user?.name || "Guest User"}</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 justify-center">
            <span className="material-symbols-outlined text-[16px]">mail</span>
            {session?.user?.email || "로그인이 필요합니다."}
          </p>
          <p className="mt-stack-md font-body-md text-body-md text-on-surface-variant max-w-sm">
            Exploring hidden alleys, vintage coffee shops, and brutalist architecture. Curating the best urban walks.
          </p>
          <button className="mt-stack-lg bg-sple-red text-on-primary-container px-6 py-3 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-2 shadow-md hover:bg-primary transition-all active:scale-95 group">
            <span className="material-symbols-outlined transition-transform duration-300 group-active:-translate-y-1 group-active:scale-110">share</span>
            Share Profile Map
          </button>
        </section>

        {/* Stats Grid (Bento Style) */}
        <section className="grid grid-cols-3 gap-gutter">
          <div className="bg-surface-container rounded-2xl p-stack-md flex flex-col items-center justify-center shadow-sm relative overflow-hidden group hover:bg-surface-container-high transition-colors">
            <div className="absolute top-0 right-0 w-16 h-16 bg-sple-red/5 rounded-bl-full pointer-events-none group-hover:bg-sple-red/10 transition-colors" />
            <span className="font-display-lg text-display-lg text-sple-red">142</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 text-center">Places Saved</span>
          </div>
          <div className="bg-surface-container rounded-2xl p-stack-md flex flex-col items-center justify-center shadow-sm relative overflow-hidden group hover:bg-surface-container-high transition-colors">
            <div className="absolute top-0 right-0 w-16 h-16 bg-smart-purple/5 rounded-bl-full pointer-events-none group-hover:bg-smart-purple/10 transition-colors" />
            <span className="font-display-lg text-display-lg text-on-surface">12</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 text-center">My Maps</span>
          </div>
          <div className="bg-surface-container rounded-2xl p-stack-md flex flex-col items-center justify-center shadow-sm relative overflow-hidden group hover:bg-surface-container-high transition-colors">
            <div className="absolute top-0 right-0 w-16 h-16 bg-guide-mint/5 rounded-bl-full pointer-events-none group-hover:bg-guide-mint/10 transition-colors" />
            <span className="font-display-lg text-display-lg text-on-surface">8.4k</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 text-center">Followers</span>
          </div>
        </section>

        {/* My Collections */}
        <section>
          <div className="flex justify-between items-end mb-stack-md">
            <h3 className="font-title-sm text-title-sm text-on-surface">My Collections</h3>
            <button className="font-label-sm text-label-sm text-sple-red hover:text-primary transition-colors flex items-center gap-1">
              See All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-stack-md">
            {/* Collection Card 1 */}
            <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group active:scale-95 duration-200">
              <div className="h-32 relative bg-surface-container-highest">
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent z-10" />
                <div className="absolute top-3 right-3 bg-glass-bg backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 z-20">
                  <span className="material-symbols-outlined text-[14px] text-sple-red fill">bookmark</span>
                  <span className="font-label-sm text-label-sm text-on-surface text-[10px]">24</span>
                </div>
              </div>
              <div className="p-stack-md bg-surface-container-low">
                <h4 className="font-title-sm text-title-sm text-on-surface mb-1">Tokyo Neon Lights</h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Night Photography</p>
              </div>
            </div>
            
            {/* Collection Card 2 */}
            <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group active:scale-95 duration-200">
              <div className="h-32 relative bg-surface-container-highest">
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent z-10" />
                <div className="absolute top-3 right-3 bg-glass-bg backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 z-20">
                  <span className="material-symbols-outlined text-[14px] text-sple-red fill">bookmark</span>
                  <span className="font-label-sm text-label-sm text-on-surface text-[10px]">18</span>
                </div>
              </div>
              <div className="p-stack-md bg-surface-container-low">
                <h4 className="font-title-sm text-title-sm text-on-surface mb-1">Hidden Cafes</h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Quiet spots for reading</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-8">
          <h3 className="font-title-sm text-title-sm text-on-surface mb-stack-md">Recent Activity</h3>
          <div className="space-y-stack-sm relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-surface-variant">
            
            <div className="flex gap-stack-md relative z-10">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border-4 border-background shrink-0 mt-1">
                <span className="material-symbols-outlined text-sple-red text-[18px]">add_location_alt</span>
              </div>
              <div className="bg-surface-container-low p-stack-md rounded-2xl flex-1 shadow-sm flex items-center gap-stack-sm">
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest shrink-0" />
                <div>
                  <p className="font-body-md text-body-md text-on-surface">Saved <span className="font-semibold">Shibuya Crossing</span></p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">2 hours ago</p>
                </div>
              </div>
            </div>

            <div className="flex gap-stack-md relative z-10">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border-4 border-background shrink-0 mt-1">
                <span className="material-symbols-outlined text-smart-purple text-[18px]">route</span>
              </div>
              <div className="bg-surface-container-low p-stack-md rounded-2xl flex-1 shadow-sm flex items-center gap-stack-sm">
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest shrink-0" />
                <div>
                  <p className="font-body-md text-body-md text-on-surface">Created map <span className="font-semibold">Weekend Walk</span></p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Yesterday</p>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Bottom Nav */}
      <BottomNavBar />
    </div>
  );
}
