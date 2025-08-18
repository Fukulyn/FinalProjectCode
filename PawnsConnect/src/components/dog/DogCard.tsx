"use client";

import type { Dog } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, XCircle, Info, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DogCardProps {
  dog: Dog;
  onLike: (dogId: string) => void;
  onPass: (dogId: string) => void;
  onDetails: (dog: Dog) => void;
  isTopCard: boolean;
  animationClass?: string; 
}

export const DogCard = ({ dog, onLike, onPass, onDetails, isTopCard, animationClass }: DogCardProps) => {
  if (!dog) return null;

  return (
    <Card 
      className={cn(
        "w-full max-w-sm mx-auto rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out relative bg-card",
        animationClass, 
        isTopCard ? "opacity-100 transform scale-100" : "opacity-0 transform scale-90 absolute -z-10"
      )}
      // 移除 style={{ aspectRatio: '3/4.5' }}，讓卡片高度根據內容動態調整
      aria-label={`關於 ${dog.name} 的資料卡`}
    >
      <CardHeader className="p-0 relative">
        {/* 移除 aspect-w-1 aspect-h-1，讓圖片容器的高度根據圖片大小調整 */}
        <div className="w-full relative" style={{ height: '400px' }}>
          <Image
            // 新增邏輯，如果圖片不存在則顯示備用圖片
            src={dog.photos && dog.photos.length > 0 ? dog.photos[0] : '/placeholder.jpg'}
            alt={dog.name}
            fill
            className="object-cover"
            priority={isTopCard}
            data-ai-hint="dog portrait"
          />
        </div>
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent">
          <CardTitle className="text-3xl font-headline text-primary-foreground drop-shadow-md">{dog.name}</CardTitle>
          <CardDescription className="text-primary-foreground/90 text-sm drop-shadow-sm">
            {dog.breed} - {dog.age} 歲
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-3 right-3 bg-black/30 hover:bg-black/50 text-white rounded-full"
          onClick={() => onDetails(dog)}
          aria-label={`更多關於 ${dog.name} 的資訊`}
        >
          <Info className="h-5 w-5" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-4 flex-grow space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{dog.description}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          <span>{dog.location}</span>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {dog.personalityTraits.slice(0, 3).map(trait => (
            <Badge key={trait} variant="secondary" className="text-xs px-1.5 py-0.5">{trait}</Badge>
          ))}
        </div>
      </CardContent>

      {isTopCard && (
        <CardFooter className="p-4 grid grid-cols-2 gap-4 border-t">
          <Button 
            variant="outline" 
            className="w-full h-14 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive" 
            onClick={() => onPass(dog.id)}
            aria-label="略過這隻狗狗"
          >
            <XCircle className="h-8 w-8" />
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-14 border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600 focus-visible:ring-green-500" 
            onClick={() => onLike(dog.id)}
            aria-label="喜歡這隻狗狗"
          >
            <Heart className="h-8 w-8" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};