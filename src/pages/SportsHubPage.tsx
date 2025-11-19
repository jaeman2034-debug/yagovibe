import { useState } from "react";
import { Link } from "react-router-dom";
import { sportsCategories } from "@/data/sportsCategories";

export default function SportsHubPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="w-full flex justify-center">
      <div className="w-full px-4 sm:px-0 pt-4 pb-4">
        {/* 로고 + 제목 */}
        <div className="text-center mt-2 mb-3">
          <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">
            ⭐ YAGO SPORTS
          </h1>
          <p className="text-gray-600 mt-1 mb-3 text-sm sm:text-base">AI Platform for Sports Enthusiasts</p>
        </div>

        {/* 검색 */}
        <div className="mt-4 flex justify-center mb-10">
          <div className="relative w-full max-w-[650px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="어떤 스포츠를 찾고 계신가요?"
              className="w-full rounded-full border px-5 py-3 text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">🎤</span>
          </div>
        </div>

        {/* 카테고리 제목 */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <span className="text-xl">🏆</span>
          <h2 className="text-xl font-bold">스포츠 카테고리</h2>
        </div>

        {/* 아이콘 그리드 */}
        <div
          className="
          grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 
          gap-5 sm:gap-6 md:gap-8
          justify-items-center
          mb-20
        "
        >
          {sportsCategories.map((cat) => (
            <Link
              key={cat.name}
              to={cat.path}
              className="flex flex-col justify-center items-center
                         bg-white shadow-sm rounded-2xl 
                         w-[85px] h-[85px] sm:w-[95px] sm:h-[95px]
                         hover:shadow-md transition"
            >
              <span className="text-3xl sm:text-4xl">{cat.icon}</span>
              <span className="text-sm mt-2 font-medium text-gray-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

