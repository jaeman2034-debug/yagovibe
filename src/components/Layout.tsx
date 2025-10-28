import { Outlet, Link } from "react-router-dom";

export default function Layout() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
            <header className="p-4 bg-white shadow-md flex justify-between items-center">
                <Link to="/home" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition-colors">
                    ⚽ YAGO VIBE
                </Link>
                <nav className="space-x-6">
                    <Link
                        to="/start"
                        className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        🎙️ 음성 가입
                    </Link>
                    <Link
                        to="/voice-map"
                        className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        🗺️ 지도
                    </Link>
                    <Link
                        to="/voice-assistant"
                        className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        🤖 AI 어시스턴트
                    </Link>
                    <Link
                        to="/admin"
                        className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        📊 관리자
                    </Link>
                </nav>
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="p-4 text-center text-sm text-gray-400 border-t bg-white">
                <div className="max-w-6xl mx-auto">
                    <p>© 2025 YAGO VIBE Platform - 음성 기반 스마트 지도 서비스</p>
                    <div className="mt-2 space-x-4">
                        <span>🎙️ 음성 인식</span>
                        <span>🗺️ 실시간 지도</span>
                        <span>🤖 AI 어시스턴트</span>
                        <span>📊 데이터 분석</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
