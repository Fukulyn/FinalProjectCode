import React from 'react';
import { PawPrint } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <PawPrint className={`${sizeClasses[size]} text-blue-500`} />
        <div className="absolute inset-0 bg-blue-500 opacity-20 blur-sm rounded-full" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold text-gray-900`}>
            PetCare
          </span>
          {size === 'lg' && (
            <span className="text-sm text-gray-500">寵物健康管理</span>
          )}
        </div>
      )}
    </div>
  );
}