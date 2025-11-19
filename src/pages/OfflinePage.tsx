/**
 * 오프라인 페이지
 * 
 * 네트워크 연결이 없을 때 표시되는 폴백 페이지입니다.
 */

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-800">
        🔌 네트워크 연결이 끊어졌어요
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        최근에 방문했던 페이지 일부는 계속 볼 수 있지만,
        <br />
        실시간 AI 분석 · 지도 · 채팅 기능은 인터넷이 필요합니다.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-full bg-blue-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 transition-colors"
      >
        다시 시도하기
      </button>
    </div>
  );
}

