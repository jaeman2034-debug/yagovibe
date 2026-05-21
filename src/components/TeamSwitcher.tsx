/**
 * 🔥 팀 스위처 UI (K-4)
 * 
 * 헤더에 드롭다운 하나면 충분
 * 팀 이름 + 역할 표시
 * 클릭 시 setActiveTeam(teamId) 호출 → 페이지 이동
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { saveTeamContext } from "@/lib/teamContext";
import { ChevronDown, Users } from "lucide-react";

const setActiveTeamFn = httpsCallable(functions, "setActiveTeam");

export function TeamSwitcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teamId: urlTeamId } = useParams<{ teamId?: string }>();
  const { teamMembers, loading } = useMyTeams();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // 현재 활성 팀 (URL 우선)
  const currentTeamId = urlTeamId || teamMembers[0]?.teamId || null;
  const currentTeam = teamMembers.find((tm) => tm.teamId === currentTeamId);

  // 팀이 1개 이하면 스위처 숨김
  if (loading || teamMembers.length <= 1) {
    return null;
  }

  const handleSwitchTeam = async (targetTeamId: string) => {
    if (targetTeamId === currentTeamId || switching) {
      return;
    }

    try {
      setSwitching(true);

      // 🔥 K-4: setActiveTeam 호출 → 페이지 이동
      await setActiveTeamFn({ teamId: targetTeamId });

      // localStorage 저장
      saveTeamContext(targetTeamId);

      // 페이지 이동 (상태만 바꾸는 SPA 전환 ❌)
      window.location.href = `/team/${targetTeamId}`;
    } catch (error: any) {
      console.error("❌ [TeamSwitcher] 팀 전환 실패:", error);
      alert("팀 전환에 실패했습니다. 다시 시도해주세요.");
      setSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
      >
        <Users className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">
          {currentTeam?.teamName || "팀 선택"}
        </span>
        {currentTeam?.role && (
          <span className="text-xs text-gray-500">
            ({currentTeam.role === "owner" ? "소유자" : currentTeam.role === "coach" ? "코치" : "멤버"})
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              {teamMembers.map((tm) => {
                const isActive = tm.teamId === currentTeamId;
                return (
                  <button
                    key={tm.teamId}
                    onClick={() => {
                      setIsOpen(false);
                      handleSwitchTeam(tm.teamId);
                    }}
                    disabled={isActive || switching}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-50 text-gray-900"
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{tm.teamName}</span>
                      <span className="text-xs text-gray-500">
                        {tm.role === "owner"
                          ? "소유자"
                          : tm.role === "coach"
                          ? "코치"
                          : "멤버"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

