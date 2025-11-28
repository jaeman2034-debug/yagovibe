// src/components/ResetSessionButton.tsx
import React, { useState } from "react";
import { resetSession } from "../lib/session";
import { LogOut } from "lucide-react";

interface ResetSessionButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

/**
 * 세션 초기화 버튼 컴포넌트
 * 로그아웃 및 모든 세션 데이터 정리
 */
export const ResetSessionButton: React.FC<ResetSessionButtonProps> = ({ 
  className = "",
  variant = "default"
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!window.confirm("로그아웃하고 앱 세션을 초기화할까요?\n\n모든 로그인 정보와 캐시가 삭제됩니다.")) {
      return;
    }

    setLoading(true);
    try {
      await resetSession();
    } catch (error) {
      console.error("❌ 세션 초기화 실패:", error);
      alert("세션 초기화 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  };

  const baseStyles = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    default: "bg-red-600 text-white hover:bg-red-700 shadow-md",
    outline: "border border-red-300 text-red-600 hover:bg-red-50",
    ghost: "text-red-600 hover:bg-red-50"
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      <LogOut className="w-4 h-4" />
      {loading ? "초기화 중..." : "로그아웃 및 세션 초기화"}
    </button>
  );
};

