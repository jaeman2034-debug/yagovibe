/**
 * 🔥 참가팀 보기 모달 (읽기 전용)
 * 
 * 기능:
 * - teamsSnapshot 데이터 표시
 * - 운영자/관중 공용
 * - 완전 읽기 전용 (수정/삭제 버튼 없음)
 * - 팀 클릭 시 상세 페이지로 이동 (팀 대표는 팀원 등록 가능)
 */

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

interface TeamsSnapshotModalProps {
  open: boolean;
  onClose: () => void;
  teams: any[];
  loading?: boolean;
  associationId?: string;
  tournamentId?: string;
}

export function TeamsSnapshotModal({
  open,
  onClose,
  teams,
  loading = false,
  associationId,
  tournamentId,
}: TeamsSnapshotModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!open) return null;
  
  // 🔥 팀 상세 페이지로 이동 (팀 대표는 팀원 등록 가능)
  const handleTeamClick = (team: any) => {
    if (!associationId || !tournamentId || !team.id) return;
    
    // 팀 대표인지 확인
    const isCaptain = user?.uid === team.captainUid;
    
    if (isCaptain) {
      // 팀 대표: 팀 상세 페이지로 이동 (팀원 등록 가능)
      navigate(`/association/${associationId}/tournaments/${tournamentId}/teams/${team.id}`);
      onClose();
    } else {
      // 일반 사용자: 읽기 전용 (현재 모달에서만 확인)
      // 클릭해도 아무 동작 없음 (읽기 전용)
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-lg p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">👥 참가팀 명단</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">
            참가팀 정보를 불러오는 중...
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            참가팀 정보가 없습니다.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {teams.map((team) => {
              const isCaptain = user?.uid === team.captainUid;
              return (
                <div
                  key={team.id || team.teamId}
                  className={`border rounded p-2 ${isCaptain ? "cursor-pointer hover:bg-gray-50" : ""}`}
                  onClick={() => isCaptain && handleTeamClick(team)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {team.teamName || team.name || "팀명 없음"}
                    </div>
                    {isCaptain && (
                      <span className="text-xs text-blue-600">내 팀 (클릭하여 팀원 등록)</span>
                    )}
                  </div>
                  {team.members && team.members.length > 0 ? (
                    <ul className="text-sm text-gray-700 mt-1 space-y-1">
                      {team.members.map((m: any, i: number) => (
                        <li key={i}>
                          - {m.name || m.displayName || "이름 없음"}
                          {m.role === "captain" || m.isCaptain ? " (팀장)" : " (선수)"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">멤버 정보 없음</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 🔥 하단 고정 문구 */}
        <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
          ※ 본 명단은 대회 시작 시점의 팀 구성입니다.
        </div>

        {/* 🔥 모바일 닫기 버튼 (하단 고정) */}
        <button
          className="mt-4 w-full py-2 bg-gray-100 rounded text-gray-700 font-medium sm:hidden"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

