/**
 * 🔥 TeamIdentityHeader - 팀 페이지 공통 헤더 (STEP 14)
 * 
 * 모든 Persona에서 공통으로 사용
 * - 사용자 정보
 * - 팀 관계 요약 (팀 수 / 팀장 여부)
 * - 설정 / 로그아웃
 * 
 * 핵심 원칙:
 * - 데이터 없으면 0, "-", "미설정" 표시
 * - 절대 에러 / Empty UI 없음
 */

import { User, Users, Settings, LogOut } from "lucide-react";
import type { Persona } from "@/pages/me/resolvePersona";
import type { User as FirebaseUser } from "firebase/auth";

interface TeamIdentityHeaderProps {
  user: FirebaseUser | null;
  persona: Persona;
  stats: {
    teamCount: number;
    isTeamCaptain: boolean;
  };
  onSettings: () => void;
  onLogout: () => void;
}

/**
 * Persona별 계정 유형 배지 텍스트
 */
function getAccountTypeBadge(persona: Persona): string {
  switch (persona) {
    case "P4":
      return "협회 관리자";
    case "P3":
      return "팀장";
    case "P2":
      return "팀 소속";
    case "P1":
      return "개인 체육인";
    case "P0":
    default:
      return "신규 회원";
  }
}

export function TeamIdentityHeader({
  user,
  persona,
  stats,
  onSettings,
  onLogout,
}: TeamIdentityHeaderProps) {
  const displayName = user?.displayName || user?.email?.split("@")[0] || "게스트";
  const email = user?.email || "이메일 없음";
  const accountType = getAccountTypeBadge(persona);

  return (
    <section className="px-4 pt-6 pb-4 bg-white border-b border-gray-200">
      {/* 프로필 정보 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">
            {displayName}
          </h1>
          <p className="text-xs text-gray-500">{email}</p>
        </div>
      </div>

      {/* 계정 유형 배지 */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {accountType}
        </span>
      </div>

      {/* 팀 관계 요약 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <div className="text-xs font-medium text-gray-900">
            {stats.teamCount > 0 ? stats.teamCount : 0}
          </div>
          <div className="text-xs text-gray-500">팀</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <div className="text-xs font-medium text-gray-900">
            {stats.isTeamCaptain ? "팀장" : "-"}
          </div>
          <div className="text-xs text-gray-500">역할</div>
        </div>
      </div>

      {/* 설정 / 로그아웃 */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSettings}
          className="flex-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-medium text-gray-900">설정</span>
        </button>
        <button
          onClick={onLogout}
          className="flex-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-medium text-gray-900">로그아웃</span>
        </button>
      </div>
    </section>
  );
}
