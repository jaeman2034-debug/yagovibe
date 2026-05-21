/**
 * 🔥 마켓 헤더 컴포넌트
 */

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MarketHeaderProps {
  title: string;
}

export default function MarketHeader({ title }: MarketHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
    </div>
  );
}
