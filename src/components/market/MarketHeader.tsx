/**
 * 🔥 마켓 헤더 컴포넌트
 */

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Sport } from "@/types/market";

interface MarketHeaderProps {
  title: string;
  showToggle?: boolean;
  contextSport?: Sport;
  view?: "sport" | "all";
  onToggle?: () => void;
}

export default function MarketHeader({
  title,
  showToggle = false,
  contextSport,
  view = "sport",
  onToggle,
}: MarketHeaderProps) {
  const navigate = useNavigate();
  const isExpanded = view === "all";

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>

        {showToggle && contextSport && contextSport !== "all" && (
          <button
            onClick={onToggle}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <span className={isExpanded ? "text-gray-500" : "text-blue-600"}>
              {isExpanded ? "전체 보기" : `${contextSport}만 보기`}
            </span>
            <span className={isExpanded ? "text-blue-600" : "text-gray-400"}>
              {isExpanded ? "✓" : "○"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
