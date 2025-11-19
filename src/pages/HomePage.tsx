import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4">
      <h1 className="text-2xl font-bold">🏠 홈 페이지 (AI 음성 비서)</h1>

      <div className="flex space-x-2">
        <Link
          to="/voice-map-simple"
          className="px-3 py-2 bg-gray-100 rounded-md border hover:bg-gray-200"
        >
          📘 지도 페이지로 이동
        </Link>
        <button className="px-3 py-2 bg-gray-100 rounded-md border hover:bg-gray-200">
          🔍 근처 편의점 찾기
        </button>
      </div>

      <p className="text-sm text-gray-600">
        예: "지도 페이지로 이동", "근처 축구장 찾아줘"
      </p>

      <Link to="/voice-map-simple" className="text-purple-600 font-semibold hover:underline">
        👉 바로 지도 페이지 보기
      </Link>
    </div>
  );
}
