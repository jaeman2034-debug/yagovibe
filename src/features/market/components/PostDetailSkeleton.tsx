/**
 * 🔥 게시글 상세 페이지 로딩 Skeleton
 * 이미지, 가격, CTA 영역 먼저 렌더
 */

export default function PostDetailSkeleton() {
  return (
    <div className="bg-white animate-pulse">
      {/* 뒤로가기 버튼 */}
      <div className="sticky top-[56px] z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="h-6 w-24 bg-gray-200 rounded" />
      </div>

      {/* 이미지 Skeleton */}
      <div className="aspect-square bg-gray-200" />

      {/* 상품 정보 Skeleton */}
      <div className="p-4 space-y-4">
        {/* 제목 */}
        <div className="space-y-2">
          <div className="h-6 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
        </div>

        {/* 가격 */}
        <div className="h-8 w-32 bg-gray-200 rounded" />

        {/* 판매자 정보 Skeleton */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* CTA 영역 Skeleton */}
        <div className="bg-gray-50 border-y border-gray-200 px-4 py-3">
          <div className="flex gap-3">
            <div className="flex-1 h-12 bg-gray-200 rounded-xl" />
            <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>

        {/* 설명 Skeleton */}
        <div className="pt-4 border-t space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
