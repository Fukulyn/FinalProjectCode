
import { PawPrint } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
      <PawPrint className="w-16 h-16 text-primary animate-bounce" />
      <p className="mt-4 text-xl font-semibold text-primary">正在載入毛夥伴...</p>
    </div>
  );
}
