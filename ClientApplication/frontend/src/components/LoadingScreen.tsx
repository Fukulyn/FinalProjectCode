import React from 'react';
import { PawPrint } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-white to-blue-50 z-50 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="relative">
          {/* 主要圖標 */}
          <div className="relative animate-bounce duration-2000">
            <PawPrint className="w-16 h-16 text-blue-500" />
            <div className="absolute inset-0 bg-blue-500 opacity-20 blur-lg rounded-full animate-pulse" />
          </div>
          
          {/* 漣漪效果 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-16 h-16 border-2 border-blue-500 rounded-full animate-ripple" />
            <div className="absolute inset-0 w-16 h-16 border-2 border-blue-500 rounded-full animate-ripple-delay" />
          </div>
        </div>

        {/* 載入進度條 */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-32">
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-full bg-blue-500 rounded-full animate-loading-bar" />
          </div>
        </div>
      </div>

      {/* 標題和副標題 */}
      <div className="mt-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 animate-fade-in">
          PetCare
        </h1>
        <p className="mt-2 text-gray-500 animate-fade-in-delay">
          寵物健康管理
        </p>
      </div>

      {/* 載入文字 */}
      <div className="mt-4 flex items-center gap-1">
        <span className="text-gray-500">載入中</span>
        <span className="flex space-x-1">
          <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce-delay-1" />
          <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce-delay-2" />
          <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce-delay-3" />
        </span>
      </div>
    </div>
  );
}