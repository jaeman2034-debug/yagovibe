/**
 * 🔥 PersonaP2Tournament - 팀 소속 선수 (미신청)
 * 
 * 상황 인지
 * - 내 팀 상태
 * - 신청 마감까지 남은 시간
 * - "팀장이 신청하면 참가 가능" 힌트
 */

import type { Tournament } from "@/types/tournament";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock } from "lucide-react";
import { useMyTeams } from "@/hooks/useMyTeams";

interface PersonaP2TournamentProps {
  tournament: Tournament | null;
  associationId: string | undefined;
  tournamentId: string | undefined;
  hasTeams: boolean;
  hasApplication: boolean;
  navigate: (path: string) => void;
}

export function PersonaP2Tournament({
  tournament,
  hasTeams,
  hasApplication,
}: PersonaP2TournamentProps) {
  const { teamMembers } = useMyTeams();
  const myTeam = teamMembers[0];

  if (!tournament) {
    return null;
  }

  const registrationEndDate = tournament.registrationPeriod?.endDate
    ? new Date(tournament.registrationPeriod.endDate)
    : null;

  const daysUntilDeadline = registrationEndDate
    ? Math.ceil(
        (registrationEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <section className="px-4 mt-6 space-y-4">
      {/* 내 팀 상태 */}
      {hasTeams && myTeam && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">내 팀</h3>
            </div>
            <p className="text-sm text-gray-700">
              팀에 소속되어 있습니다. 팀장이 대회 신청을 진행할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 신청 마감까지 남은 시간 */}
      {registrationEndDate && daysUntilDeadline !== null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">신청 마감</h3>
            </div>
            <p className="text-sm text-gray-700">
              {daysUntilDeadline > 0
                ? `신청 마감까지 ${daysUntilDeadline}일 남았습니다.`
                : daysUntilDeadline === 0
                ? "오늘 마감입니다."
                : "신청 마감되었습니다."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 힌트 */}
      {!hasApplication && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              💡 팀장이 신청하면 참가 가능합니다. 팀장에게 문의해주세요.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
