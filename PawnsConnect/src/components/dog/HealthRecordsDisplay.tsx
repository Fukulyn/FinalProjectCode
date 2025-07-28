
import type { Dog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Utensils, ShieldCheck } from 'lucide-react';

interface HealthRecordsDisplayProps {
  dog: Dog;
}

const formatDateSafe = (dateString: string | undefined | null): string => {
  if (!dateString) return '未提供';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '日期無效';
    return date.toLocaleDateString('zh-TW');
  } catch (e) {
    return '日期格式錯誤';
  }
};

export const HealthRecordsDisplay = ({ dog }: HealthRecordsDisplayProps) => {
  // Filter out empty or "None"/"無" strings to get a clean list of meaningful conditions.
  const meaningfulConditions = dog.healthRecords?.conditions?.filter(
    c => c && c.trim() && c.trim().toLowerCase() !== 'none' && c.trim() !== '無'
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-secondary/50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <ClipboardList className="h-6 w-6 text-primary" />
            健康記錄
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <p><strong>上次檢查：</strong> {formatDateSafe(dog.healthRecords?.lastCheckup)}</p>
          <div>
            <strong>狀況：</strong>
            {meaningfulConditions && meaningfulConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {meaningfulConditions.map((condition, index) => (
                  <Badge key={index} variant="secondary">{condition}</Badge>
                ))}
              </div>
            ) : (
              <span className="ml-1">無特殊狀況</span>
            )}
          </div>
          <p><strong>備註：</strong> {dog.healthRecords?.notes || '無'}</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="bg-secondary/50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <Utensils className="h-6 w-6 text-primary" />
            餵食計畫
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <p><strong>食物種類：</strong> {dog.feedingSchedule?.foodType || '未指定'}</p>
          <p><strong>每日次數：</strong> {dog.feedingSchedule?.timesPerDay ?? '未指定'}</p>
          <p><strong>份量：</strong> {dog.feedingSchedule?.portionSize || '未指定'}</p>
          <p><strong>備註：</strong> {dog.feedingSchedule?.notes || '無'}</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="bg-secondary/50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <ShieldCheck className="h-6 w-6 text-primary" />
            疫苗接種記錄
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {dog.vaccinationRecords && dog.vaccinationRecords.length > 0 ? (
            dog.vaccinationRecords.map((vaccine, index) => (
              <div key={index} className="pb-2 mb-2 border-b border-border last:border-b-0 last:pb-0 last:mb-0">
                <p><strong>疫苗名稱：</strong> {vaccine.vaccineName || '未指定疫苗'}</p>
                <p><strong>施打日期：</strong> {formatDateSafe(vaccine.dateAdministered)}</p>
                {vaccine.nextDueDate && <p><strong>下次到期日：</strong> {formatDateSafe(vaccine.nextDueDate)}</p>}
              </div>
            ))
          ) : (
            <p>無疫苗接種記錄。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
