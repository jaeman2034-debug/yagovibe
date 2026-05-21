/**
 * 🔥 PersonaP3Tournament - 팀장
 * 
 * 행동 가능 상태
 * - 신청 상태
 * - 제출 서류 / 규칙
 * - (신청 완료 시) 접수 완료 안내
 */

import type { Tournament } from "@/types/tournament";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";

interface PersonaP3TournamentProps {
  tournament: Tournament | null;
  associationId: string | undefined;
  tournamentId: string | undefined;
  isTeamCaptain: boolean;
  hasApplication: boolean;
  navigate: (path: string) => void;
}

export function PersonaP3Tournament({
  tournament,
  associationId,
  tournamentId,
  hasApplication,
}: PersonaP3TournamentProps) {
  const { applications } = useMyTournamentApplications();
  
  // 이 대회에 대한 신청 찾기
  const myApplication = applications.find(
    (app) =>
      app.associationId === associationId && app.tournamentId === tournamentId
  );

  if (!tournament) {
    return null;
  }

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "APPROVED":
        return <Badge className="bg-green-500 text-xs">✅ 승인</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="text-xs">❌ 반려</Badge>;
      case "HOLD":
        return <Badge variant="outline" className="text-xs">⏸️ 보류</Badge>;
      case "PENDING":
      default:
        return <Badge variant="secondary" className="text-xs">⏳ 대기</Badge>;
    }
  };

  return (
    <section className="px-4 mt-6 space-y-4">
      {/* 신청 상태 (STEP: 대회 참가 플로우) */}
      {myApplication ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">신청 상태</h3>
              {getStatusBadge(myApplication.status)}
            </div>
            <p className="text-sm text-gray-700">
              {myApplication.teamName} 팀으로 신청하셨습니다.
            </p>
            {myApplication.status?.toUpperCase() === "PENDING" && (
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  ⏳ 신청 중입니다. 승인 대기 중입니다.
                </p>
              </div>
            )}
            {myApplication.status?.toUpperCase() === "APPROVED" && (
              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-sm text-green-800">
                  ✅ 참가 확정되었습니다. 다음 단계를 진행해주세요.
                </p>
              </div>
            )}
            {myApplication.status?.toUpperCase() === "REJECTED" && (
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-sm text-red-800">
                  ❌ 반려되었습니다. 재신청이 가능합니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">신청 상태</h3>
            <p className="text-sm text-gray-700">
              아직 신청하지 않았습니다. 아래 버튼을 눌러 신청하세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 제출 서류 / 규칙 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">제출 서류</h3>
          </div>
          {tournament.rules && tournament.rules.length > 0 ? (
            <ul className="text-sm text-gray-700 space-y-1">
              {tournament.rules.map((rule, idx) => (
                <li key={idx}>• {rule}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">
              필요한 서류는 신청 시 안내됩니다.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
