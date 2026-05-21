// src/components/common/HubBackButton.tsx
// 🔥 종목 페이지에서 전체 허브로 이동하는 공통 버튼

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function HubBackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/hub")}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
    >
      <ArrowLeft size={16} />
      <span>허브로 이동</span>
    </button>
  );
}

