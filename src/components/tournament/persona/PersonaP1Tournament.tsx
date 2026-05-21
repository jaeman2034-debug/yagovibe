/**
 * 🔥 PersonaP1Tournament - 개인 체육인 (대회 페이지)
 * 
 * 정보 소비자
 * - 대회 형식 안내
 * - 일정 / 규칙 요약
 * - "팀으로 참가하는 대회예요" 힌트
 * - 참가 요구 ❌
 */

import type { Tournament } from "@/types/tournament";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

interface PersonaP1TournamentProps {
  tournament: Tournament | null;
  associationId: string | undefined;
  tournamentId: string | undefined;
  navigate: (path: string) => void;
}

export function PersonaP1Tournament({
  tournament,
}: PersonaP1TournamentProps) {
  if (!tournament) {
    return null;
  }

  return (
    <section className="px-4 mt-6 space-y-4">
      {/* 대회 형식 안내 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                이 대회는 이런 형식입니다
              </h3>
              {tournament.rules && tournament.rules.length > 0 ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  {tournament.rules.map((rule, idx) => (
                    <li key={idx}>• {rule}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">
                  대회 상세 규칙은 추후 공개됩니다.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 일정 요약 */}
      {tournament.dateStart && tournament.dateEnd && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">대회 일정</h3>
            <p className="text-sm text-gray-700">
              {new Date(tournament.dateStart).toLocaleDateString("ko-KR")} ~{" "}
              {new Date(tournament.dateEnd).toLocaleDateString("ko-KR")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 힌트 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            💡 이 대회는 팀으로 참가하는 대회예요. 팀에 소속되어 있으면 팀장이
            신청할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
