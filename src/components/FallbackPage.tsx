/**
 * 🔥 FallbackPage - 동적 import 실패 시 대체 페이지
 * 
 * lazy() import가 실패했을 때 표시되는 대체 컴포넌트
 */

import { AlertCircle, RefreshCw } from "lucide-react";

interface FallbackPageProps {
  pageName?: string;
  onRetry?: () => void;
}

export default function FallbackPage({ pageName = "페이지", onRetry }: FallbackPageProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // 기본 동작: 페이지 새로고침
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-none md:max-w-3xl rounded-lg bg-white p-6 shadow-md">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-yellow-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {pageName}를 불러올 수 없습니다
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            네트워크 문제나 캐시 문제로 인해 페이지를 로드하지 못했습니다.
            <br />
            새로고침을 시도해주세요.
          </p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </div>
    </div>
  );
}

