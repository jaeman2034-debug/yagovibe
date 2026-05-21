/**
 * 🔥 /me 페이지 에러 폴백
 */
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

export function MeErrorFallback({ error, onRetry }: MeErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">일시적인 오류가 발생했어요</h2>
        <p className="text-gray-600 mb-4">
          {error?.message || "데이터를 불러오는 중 문제가 발생했습니다."}
        </p>
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            다시 시도
          </Button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          페이지 새로고침
        </button>
      </div>
    </div>
  );
}
