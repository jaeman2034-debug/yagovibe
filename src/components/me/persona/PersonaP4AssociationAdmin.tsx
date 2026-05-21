/**
 * 🔥 PersonaP4AssociationAdmin - 협회 관리자
 */

import { Shield, Trophy, CheckCircle, Settings } from "lucide-react";
import type { PersonaData } from "@/hooks/useMePersona";

interface PersonaP4AssociationAdminProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

export function PersonaP4AssociationAdmin({ personaData, navigate }: PersonaP4AssociationAdminProps) {
  // TODO: 실제 데이터 조회
  const managedTournaments: any[] = [];
  const pendingApprovals: any[] = [];
  const stats = {
    totalTeams: 0,
    activeTournaments: 0,
    pendingCount: pendingApprovals.length,
  };

  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 관리자 개요 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-semibold text-gray-900">관리자 개요</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{stats.totalTeams}</div>
            <div className="text-xs text-gray-600">총 참가 팀</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{stats.activeTournaments}</div>
            <div className="text-xs text-gray-600">진행 중 대회</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{stats.pendingCount}</div>
            <div className="text-xs text-gray-600">승인 대기</div>
          </div>
        </div>
      </div>

      {/* 운영 중인 대회 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">운영 중인 대회</h2>
          </div>
          <button
            onClick={() => navigate("/app/admin/tournaments")}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            전체 보기 →
          </button>
        </div>
        {managedTournaments.length > 0 ? (
          <div className="space-y-2">
            {managedTournaments.map((tournament) => (
              <button
                key={tournament.id}
                onClick={() => navigate(`/app/admin/tournaments/${tournament.id}`)}
                className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-left"
              >
                <div className="text-sm font-medium text-gray-900">{tournament.name}</div>
                <div className="text-xs text-gray-500 mt-1">참가 팀: {tournament.teamCount}팀</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">운영 중인 대회가 없습니다</p>
          </div>
        )}
      </div>

      {/* 승인 대기 */}
      {pendingApprovals.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-base font-semibold text-gray-900">승인 대기</h2>
            </div>
            <button
              onClick={() => navigate("/app/admin/approvals")}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              전체 보기 →
            </button>
          </div>
          <div className="space-y-2">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="p-3 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-900">{approval.teamName}</div>
                <div className="text-xs text-gray-500 mt-1">대기 중</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 관리자 도구 */}
      <div className="bg-white rounded-lg border border-purple-300 bg-purple-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-purple-700">👑 관리자 도구</p>
            <p className="text-sm text-purple-600">
              플랫폼 운영 및 관리 기능으로 이동
            </p>
          </div>
          <button
            onClick={() => navigate("/app/admin/home")}
            className="rounded-lg bg-purple-600 px-4 py-2 text-white text-sm hover:bg-purple-700 active:scale-95 transition-all whitespace-nowrap"
          >
            관리자 대시보드
          </button>
        </div>
      </div>
    </section>
  );
}
