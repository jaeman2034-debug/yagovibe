/**
 * 🔥 AppSkeleton - 앱 전체 로딩 스켈레톤
 * 
 * 역할:
 * - 온보딩/초기 로딩 시 표시
 * - "빠르다"는 착각을 만드는 스켈레톤 UI
 */

import { Skeleton } from "@/components/ui/skeleton";

export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 스켈레톤 */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* 카드 그리드 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>

        {/* 콘텐츠 스켈레톤 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}
