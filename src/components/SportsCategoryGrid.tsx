// ✅ src/components/SportsCategoryGrid.tsx
import React from "react";

const categories = [
  { name: "야구", icon: "⚾" },
  { name: "축구", icon: "⚽" },
  { name: "농구", icon: "🏀" },
  { name: "배구", icon: "🏐" },
  { name: "골프", icon: "🏌️‍♀️" },
  { name: "피크골프", icon: "⛳" },
  { name: "테니스", icon: "🎾" },
  { name: "러닝", icon: "🏃‍♂️" },
  { name: "아웃도어", icon: "🏔️" },
  { name: "배드민턴", icon: "🏸" },
  { name: "탁구", icon: "🏓" },
  { name: "수영", icon: "🏊‍♂️" },
  { name: "헬스/피트니스", icon: "💪" },
  { name: "요가/필라테스", icon: "🧘‍♀️" },
  { name: "클라이밍", icon: "🧗‍♂️" },
  { name: "기타", icon: "🏆" },
];

export default function SportsCategoryGrid() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* 제목 */}
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4">
        🏆 스포츠 카테고리
      </h2>

      {/* 4×4 정사각형 그리드 */}
      <div
        className="
          grid grid-cols-4 gap-3 sm:gap-4 md:gap-5
          w-[90vw] max-w-[600px]
          aspect-square mx-auto
          justify-items-center items-center
        "
      >
        {categories.map((cat, i) => (
          <div
            key={i}
            className="
              flex flex-col items-center justify-center
              w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] md:w-[90px] md:h-[90px]
              bg-white dark:bg-gray-800
              rounded-2xl shadow-md
              hover:shadow-lg hover:scale-105
              transition-all duration-200
            "
          >
            <span className="text-4xl md:text-5xl mb-1">{cat.icon}</span>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
              {cat.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

