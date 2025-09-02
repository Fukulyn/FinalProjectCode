"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Filter, Dog, Cat } from 'lucide-react';
import { DOG_BREEDS, CAT_BREEDS, type BreedFilter } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BreedFilterProps {
  currentFilter: BreedFilter;
  onFilterChange: (filter: BreedFilter) => void;
}

export const BreedFilterComponent = ({ currentFilter, onFilterChange }: BreedFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState<BreedFilter>(currentFilter);

  const handleAnimalTypeChange = (animalType: 'dog' | 'cat' | 'all') => {
    setTempFilter({
      animalType,
      selectedBreeds: [] // Reset breeds when changing animal type
    });
  };

  const handleBreedToggle = (breed: string) => {
    const isSelected = tempFilter.selectedBreeds.includes(breed);
    if (isSelected) {
      setTempFilter({
        ...tempFilter,
        selectedBreeds: tempFilter.selectedBreeds.filter(b => b !== breed)
      });
    } else {
      setTempFilter({
        ...tempFilter,
        selectedBreeds: [...tempFilter.selectedBreeds, breed]
      });
    }
  };

  const handleApplyFilter = () => {
    onFilterChange(tempFilter);
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    const clearedFilter = { animalType: 'all' as const, selectedBreeds: [] };
    setTempFilter(clearedFilter);
    onFilterChange(clearedFilter);
    setIsOpen(false);
  };

  const getActiveFilterText = () => {
    const parts = [];
    
    if (currentFilter.animalType !== 'all') {
      parts.push(currentFilter.animalType === 'dog' ? '狗' : '貓');
    }
    
    if (currentFilter.selectedBreeds.length > 0) {
      if (currentFilter.selectedBreeds.length === 1) {
        parts.push(currentFilter.selectedBreeds[0]);
      } else {
        parts.push(`${currentFilter.selectedBreeds.length} 個品種`);
      }
    }
    
    return parts.length > 0 ? parts.join(' • ') : '所有動物';
  };

  const hasActiveFilters = currentFilter.animalType !== 'all' || currentFilter.selectedBreeds.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={hasActiveFilters ? "default" : "outline"} 
          className="relative"
        >
          <Filter className="w-4 h-4 mr-2" />
          品種篩選
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {currentFilter.selectedBreeds.length || 1}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            品種篩選
          </DialogTitle>
          <DialogDescription>
            選擇您想要查看的動物類型和品種。目前篩選：{getActiveFilterText()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs value={tempFilter.animalType} onValueChange={handleAnimalTypeChange as any} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">所有動物</TabsTrigger>
              <TabsTrigger value="dog" className="flex items-center gap-2">
                <Dog className="w-4 h-4" />
                狗
              </TabsTrigger>
              <TabsTrigger value="cat" className="flex items-center gap-2">
                <Cat className="w-4 h-4" />
                貓
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex-1 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">查看所有動物</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    選擇此選項將顯示所有可領養的狗和貓，不限品種。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dog" className="flex-1 mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Dog className="w-5 h-5" />
                    狗狗品種
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-2 gap-2">
                      {DOG_BREEDS.map((breed) => (
                        <Button
                          key={breed}
                          variant={tempFilter.selectedBreeds.includes(breed) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleBreedToggle(breed)}
                          className="justify-start"
                        >
                          {breed}
                          {tempFilter.selectedBreeds.includes(breed) && (
                            <X className="w-3 h-3 ml-2" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cat" className="flex-1 mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cat className="w-5 h-5" />
                    貓咪品種
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-2 gap-2">
                      {CAT_BREEDS.map((breed) => (
                        <Button
                          key={breed}
                          variant={tempFilter.selectedBreeds.includes(breed) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleBreedToggle(breed)}
                          className="justify-start"
                        >
                          {breed}
                          {tempFilter.selectedBreeds.includes(breed) && (
                            <X className="w-3 h-3 ml-2" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClearFilter}>
            清除篩選
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleApplyFilter}>
              套用篩選
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
