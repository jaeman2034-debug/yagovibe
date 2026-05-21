/**
 * 🔥 PersonaP4Tournament - 관리자
 * 
 * 운영
 * - 신청 팀 수
 * - 승인/관리 도구
 */

import type { Tournament } from "@/types/tournament";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonaP4TournamentProps {
  tournament: Tournament | null;
  associationId: string | undefined;
  tournamentId: string | undefined;
  navigate: (path: string) => void;
}

export function PersonaP4Tournament({
  tournament,
  associationId,
  tournamentId,
  navigate,
}: PersonaP4TournamentProps) {
  if (!tournament || !associationId || !tournamentId) {
    return null;
  }

  const teamCount = tournament.teamCount || 0;

  return (
    <section className="px-4 mt-6 space-y-4">
      {/* 신청 팀 수 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">신청 팀 수</h3>
            </div>
            <span className="text-lg font-bold text-gray-900">{teamCount}팀</span>
          </div>
        </CardContent>
      </Card>

      {/* 승인/관리 도구 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">관리 도구</h3>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                navigate(
                  `/association/${associationId}/admin/tournaments/${tournamentId}`
                )
              }
            >
              대회 관리
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                navigate(
                  `/association/${associationId}/admin/tournaments/${tournamentId}/ops`
                )
              }
            >
              운영 대시보드
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
