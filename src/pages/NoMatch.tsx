import { Link } from "react-router-dom";

export default function NoMatch() {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center bg-gradient-to-br from-red-50 to-pink-100">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
                <h1 className="text-4xl font-bold mb-4 text-red-600">🚧 페이지를 찾을 수 없습니다</h1>
                <p className="mb-6 text-gray-600">
                    요청하신 경로가 존재하지 않거나 이동 중 오류가 발생했습니다.
                </p>
                <div className="space-y-3">
                    <Link
                        to="/"
                        className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold"
                    >
                        🏠 홈으로 돌아가기
                    </Link>
                    <Link
                        to="/start"
                        className="block w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-semibold"
                    >
                        🎙️ 음성 회원가입
                    </Link>
                    <Link
                        to="/admin"
                        className="block w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-semibold"
                    >
                        📊 관리자 대시보드
                    </Link>
                </div>
            </div>
        </div>
    );
}
