"use client";

import { useState } from "react";
import { User, LogOut, Settings } from "lucide-react";

export default function ProfilePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    // 임시 로그인 처리
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className="flex flex-col h-full bg-background pt-[72px] pb-[80px] px-6">
      
      {!isLoggedIn ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-2">
            <User size={40} className="text-gray-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary mb-2">로그인이 필요해요</h2>
            <p className="text-text-secondary text-sm">SPLE의 모든 기능을 사용하려면<br/>구글 계정으로 로그인해주세요.</p>
          </div>
          
          <button 
            onClick={handleLogin}
            className="w-full max-w-xs h-[52px] mt-4 flex items-center justify-center gap-3 bg-white border border-gray-200 text-text-primary rounded-xl font-bold shadow-sm active:scale-[0.98] transition-all"
          >
            {/* 구글 아이콘 SVG 임시 */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google로 계속하기
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center pt-10">
          <div className="w-28 h-28 bg-gray-200 rounded-full flex items-center justify-center mb-6 shadow-sm overflow-hidden">
            <User size={48} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">김스플</h2>
          <p className="text-text-secondary text-sm mb-8">user@gmail.com</p>

          <div className="w-full flex flex-col gap-3">
            <button className="w-full h-[56px] flex items-center justify-between px-6 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-gray-500" />
                <span className="font-medium text-text-primary">내 정보 수정</span>
              </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </button>

            <button 
              onClick={handleLogout}
              className="w-full h-[56px] flex items-center justify-between px-6 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all mt-4"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} className="text-red-500" />
                <span className="font-medium text-red-500">로그아웃</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
