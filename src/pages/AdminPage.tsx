import { Link } from "react-router-dom";

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-4xl">⚙️</span>
        <h1 className="text-3xl font-extrabold">관리자 대시보드</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 rounded-2xl border bg-white/70">
          <h2 className="text-xl font-bold mb-3">사용자 통계</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>총 사용자:</span>
              <span className="font-semibold">1,234명</span>
            </div>
            <div className="flex justify-between">
              <span>활성 사용자:</span>
              <span className="font-semibold">567명</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-2xl border bg-white/70">
          <h2 className="text-xl font-bold mb-3">음성 명령 통계</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>지도 검색:</span>
              <span className="font-semibold">89회</span>
            </div>
            <div className="flex justify-between">
              <span>페이지 이동:</span>
              <span className="font-semibold">45회</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border bg-white/70 mb-4">
        <h2 className="text-xl font-bold mb-3">최근 활동</h2>
        <div className="space-y-2 text-sm">
          <div className="p-2 bg-gray-50 rounded">사용자가 "축구장 찾아줘" 명령 실행</div>
          <div className="p-2 bg-gray-50 rounded">사용자가 "홈으로 가자" 명령 실행</div>
          <div className="p-2 bg-gray-50 rounded">새로운 사용자 등록</div>
        </div>
      </div>

      <div className="mt-6">
        <Link to="/" className="text-indigo-700 underline text-sm">👉 홈으로 이동</Link>
      </div>
    </div>
  );
}
