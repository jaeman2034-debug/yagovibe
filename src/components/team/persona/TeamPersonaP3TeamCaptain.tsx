/**
 * 🔥 TeamPersonaP3TeamCaptain - 팀장 (STEP 14)
 * 
 * 팀장 UI:
 * - 팀 관리
 * - 선수 목록
 * - 대회 참가 관리
 */

import { Users, UserPlus, Trophy } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";
import type { PersonaData } from "@/hooks/useMePersona";
import { useMyTeams } from "@/hooks/useMyTeams";

interface TeamPersonaP3TeamCaptainProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

/**
 * 🔥 팀장 UI
 * 
 * STEP 14 설계:
 * - 팀 관리
 * - 선수 목록
 * - 대회 참가 관리
 */
export function TeamPersonaP3TeamCaptain({ personaData, navigate }: TeamPersonaP3TeamCaptainProps) {
  const { teamMembers } = useMyTeams();
  const myTeam = teamMembers[0];

  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 팀 관리 */}
      {myTeam && (
        <MeCard
          variant="info"
          icon={<Users className="w-5 h-5" />}
          title="팀 관리"
        >
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-900">팀 ID: {myTeam.teamId}</p>
              <p className="text-xs text-gray-600">팀장</p>
            </div>
            <button
              onClick={() => navigate(`/teams/${myTeam.teamId}/manage`)}
              className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              팀 관리하기
            </button>
          </div>
        </MeCard>
      )}

      {/* 선수 목록 */}
      <MeCard
        variant="info"
        icon={<UserPlus className="w-5 h-5" />}
        title="선수 목록"
      >
        <p className="text-sm text-gray-600">
          곧 선수 목록이 표시됩니다
        </p>
      </MeCard>

      {/* 대회 참가 관리 */}
      <MeCard
        variant="info"
        icon={<Trophy className="w-5 h-5" />}
        title="대회 참가 관리"
      >
        <p className="text-sm text-gray-600">
          곧 대회 참가 관리가 표시됩니다
        </p>
      </MeCard>
    </section>
  );
}
