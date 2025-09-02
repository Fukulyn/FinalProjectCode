
"use client";

import type { Dog } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { HealthRecordsDisplay } from './HealthRecordsDisplay';
import { Badge } from '@/components/ui/badge';
import { MapPin, Heart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Link from 'next/link';

const translateGender = (gender: 'Male' | 'Female' | 'Unknown' | undefined): string => {
  switch (gender) {
    case 'Male': return '公';
    case 'Female': return '母';
    case 'Unknown': return '未知';
    default: return '未知';
  }
};

interface DogDetailsModalProps {
  dog: Dog | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DogDetailsModal = ({ dog, isOpen, onClose }: DogDetailsModalProps) => {
  if (!dog) return null;

  const dogPhotos = dog.photos && dog.photos.length > 0 ? dog.photos : ['https://placehold.co/600x400.png'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-3xl font-headline text-primary">{dog.name}</DialogTitle>
              <DialogDescription className="text-lg">{dog.breed} - {dog.age} 歲 - {translateGender(dog.gender)}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Carousel className="w-full rounded-lg overflow-hidden shadow-lg">
                  <CarouselContent>
                    {dogPhotos.map((photo, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-w-4 aspect-h-3">
                          <Image
                            src={photo || 'https://placehold.co/600x400.png'}
                            alt={`${dog.name} 照片 ${index + 1}`}
                            width={600}
                            height={400}
                            className="object-cover w-full h-full"
                            data-ai-hint="dog"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {dogPhotos.length > 1 && (
                    <>
                      <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                      <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                    </>
                  )}
                </Carousel>
                <div className="space-y-2">
                  <p className="text-foreground/80">{dog.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{dog.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dog.personalityTraits && dog.personalityTraits.map(trait => (
                      <Badge key={trait} variant="secondary" className="bg-accent/20 text-accent-foreground">{trait}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <HealthRecordsDisplay dog={dog} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-secondary/30 flex justify-end items-center gap-3 mt-auto">
          <Button variant="outline" onClick={onClose}>關閉</Button>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/adoption-info">
              <Heart className="mr-2 h-4 w-4" /> 表達領養意願
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
