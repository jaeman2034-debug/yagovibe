/**
 * 🔥 TeamPersonaP2TeamMember - 팀 소속 선수 (STEP 14)
 * 
 * 팀 소속 선수 UI:
 * - 내 팀 카드
 * - 팀 일정
 * - 팀 공지
 * - 관리 버튼 없음
 */

import { Users, Calendar, Bell } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";
import type { PersonaData } from "@/hooks/useMePersona";
import { useMyTeams } from "@/hooks/useMyTeams";

interface TeamPersonaP2TeamMemberProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

/**
 * 🔥 팀 소속 선수 UI
 * 
 * STEP 14 설계:
 * - 내 팀 카드
 * - 팀 일정
 * - 팀 공지
 * - 관리 버튼 없음
 */
export function TeamPersonaP2TeamMember({ personaData, navigate }: TeamPersonaP2TeamMemberProps) {
  const { teamMembers } = useMyTeams();
  const myTeam = teamMembers[0];

  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 내 팀 카드 */}
      {myTeam && (
        <MeCard
          variant="info"
          icon={<Users className="w-5 h-5" />}
          title="내 팀"
        >
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-900">팀 ID: {myTeam.teamId}</p>
              <p className="text-xs text-gray-600">팀 소속 선수</p>
            </div>
          </div>
        </MeCard>
      )}

      {/* 팀 일정 */}
      <MeCard
        variant="info"
        icon={<Calendar className="w-5 h-5" />}
        title="팀 일정"
      >
        <p className="text-sm text-gray-600">
          곧 팀 일정이 표시됩니다
        </p>
      </MeCard>

      {/* 팀 공지 */}
      <MeCard
        variant="info"
        icon={<Bell className="w-5 h-5" />}
        title="팀 공지"
      >
        <p className="text-sm text-gray-600">
          곧 팀 공지가 표시됩니다
        </p>
      </MeCard>
    </section>
  );
}
