/**
 * 🔥 /me 페이지 전용 IdentityHeader (STEP 15B)
 * 
 * 공용 IdentityHeader를 /me 컨텍스트에 맞게 래핑
 */

import { User, Settings, LogOut, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Persona } from "@/components/ui/personas/types";
import type { User as FirebaseUser } from "firebase/auth";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";

interface MeIdentityHeaderProps {
  user: FirebaseUser | null;
  persona: Persona;
  stats: {
    teamCount: number;
    tournamentCount: number;
    recordCount: number;
  };
  onSettings: () => void;
  onLogout: () => void;
  onCreateTeam?: () => void;
  onCoachDashboard?: () => void;
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

export function MeIdentityHeader({
  user,
  persona,
  stats,
  onSettings,
  onLogout,
  onCreateTeam,
  onCoachDashboard,
}: MeIdentityHeaderProps) {
  const navigate = useNavigate();
  const displayName = user?.displayName || user?.email?.split("@")[0] || "게스트";
  const email = user?.email || "이메일 없음";
  const accountType = getAccountTypeBadge(persona);

  // 메타 정보 (활동 요약)
  const meta = (
    <>
      {/* 계정 유형 배지 */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {accountType}
        </span>
      </div>

      {/* 프로필 정보 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500">{email}</p>
        </div>
      </div>

      {/* 활동 요약 */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <div className="text-xs font-medium text-gray-900">
            {stats.teamCount > 0 ? stats.teamCount : 0}
          </div>
          <div className="text-xs text-gray-500">팀</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <div className="text-xs font-medium text-gray-900">
            {stats.tournamentCount > 0 ? stats.tournamentCount : 0}
          </div>
          <div className="text-xs text-gray-500">대회</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 text-center">
          <div className="text-xs font-medium text-gray-900">
            {stats.recordCount > 0 ? stats.recordCount : "-"}
          </div>
          <div className="text-xs text-gray-500">기록</div>
        </div>
      </div>

      {/* 코치 진입 버튼 */}
      <div className="mt-4 space-y-2">
        {onCreateTeam && (
          <button
            onClick={onCreateTeam}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>팀 만들기</span>
          </button>
        )}
        {onCoachDashboard && stats.teamCount > 0 && (
          <button
            onClick={onCoachDashboard}
            className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>코치 대시보드</span>
          </button>
        )}
      </div>
    </>
  );

  // 액션 버튼
  const actions = (
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
  );

  return (
    <IdentityHeader
      title={displayName}
      subtitle={email}
      meta={meta}
      actions={actions}
    />
  );
}
