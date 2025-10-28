import { Link } from "react-router-dom";

export default function TeamBlogPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-4xl">📝</span>
        <h1 className="text-3xl font-extrabold">팀 블로그</h1>
      </div>
      
      <div className="p-4 rounded-2xl border bg-white/70 mb-4">
        <h2 className="text-xl font-bold mb-3">최신 포스트</h2>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">YAGO VIBE SPT 프로젝트 시작</h3>
            <p className="text-sm text-gray-600">AI 음성 비서와 지도 통합 기능을 개발 중입니다.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Firebase 연동 완료</h3>
            <p className="text-sm text-gray-600">Firebase Authentication과 Firestore가 성공적으로 연동되었습니다.</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link to="/" className="text-indigo-700 underline text-sm">👉 홈으로 이동</Link>
      </div>
    </div>
  );
}
