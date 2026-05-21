/**
 * 🔥 /me 페이지 로딩 스켈레톤
 */
export function MeSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 pt-6 pb-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-4 mt-6">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
