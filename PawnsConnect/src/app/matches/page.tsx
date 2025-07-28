
"use client";

import { useState, useEffect } from 'react';
import { usePawsConnect } from '@/context/PawsConnectContext';
import type { Dog } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DogDetailsModal } from '@/components/dog/DogDetailsModal';
import { Heart, Info, Video } from 'lucide-react';

export default function MatchesPage() {
  const { likedDogs, getDogById } = usePawsConnect();
  const [selectedDogDetails, setSelectedDogDetails] = useState<Dog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleShowDetails = (dogId: string) => {
    const dog = getDogById(dogId);
    if (dog) {
      setSelectedDogDetails(dog);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
        setSelectedDogDetails(null);
    }, 300);
  };

  useEffect(() => {
    if (selectedDogDetails) {
      setIsModalOpen(true);
    }
  }, [selectedDogDetails]);

  if (likedDogs.length === 0) {
    return (
      <div className="text-center py-10">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-headline mb-2">目前沒有配對</h2>
        <p className="text-muted-foreground">繼續滑動卡片來尋找您完美的毛茸茸夥伴！</p>
        <Button onClick={() => window.location.href='/'} className="mt-6">開始滑卡</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary text-center">您的配對</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {likedDogs.map((dog) => (
          <Card key={dog.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
            <CardHeader className="p-0">
              <div className="aspect-w-4 aspect-h-3">
                <Image
                  src={dog.photos[0]}
                  alt={dog.name}
                  width={400}
                  height={300}
                  className="object-cover w-full h-full"
                  data-ai-hint="dog"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <CardTitle className="text-2xl font-headline text-primary">{dog.name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{dog.breed}, {dog.age} 歲</CardDescription>
              <p className="mt-2 text-sm line-clamp-2">{dog.description}</p>
            </CardContent>
            <CardFooter className="p-4 border-t grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={() => handleShowDetails(dog.id)} className="w-full">
                <Info className="mr-2 h-4 w-4" /> 詳細資料 & 即時影像
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <DogDetailsModal dog={selectedDogDetails} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
