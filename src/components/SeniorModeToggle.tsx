// src/components/SeniorModeToggle.tsx
// 🔥 어르신 모드 토글 컴포넌트

import { useTeam } from "@/context/TeamContext";

export default function SeniorModeToggle() {
  const { seniorMode, setSeniorMode } = useTeam();

  return (
    <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={seniorMode}
          onChange={(e) => setSeniorMode(e.target.checked)}
          className="w-6 h-6 mr-3 cursor-pointer"
        />
        <div>
          <span className={`font-bold ${seniorMode ? "text-2xl" : "text-lg"} text-gray-900`}>
            어르신 모드 {seniorMode ? "ON" : "OFF"}
          </span>
          <p className={`text-gray-600 ${seniorMode ? "text-lg" : "text-sm"} mt-1`}>
            {seniorMode ? "글자 크게, 버튼 크게, 색상 강조" : "일반 모드"}
          </p>
        </div>
      </label>
    </div>
  );
}

