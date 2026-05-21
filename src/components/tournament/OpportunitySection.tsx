/**
 * 🔥 대회 페이지 OpportunitySection (STEP: 대회 참가 플로우)
 * 
 * CTA는 여기만
 * - P3 (팀장)만 ApplyTournamentCard 표시
 * - 참가 상태에 따라 버튼 텍스트/상태 변경
 */

import type { Persona } from "@/components/ui/personas/types";
import { ApplyTournamentCard } from "@/components/me/opportunity/ApplyTournamentCard";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";

interface OpportunitySectionProps {
  persona: Persona;
  associationId: string | undefined;
  tournamentId: string | undefined;
  onApply: () => void;
}

export function TournamentOpportunitySection({
  persona,
  associationId,
  tournamentId,
  onApply,
}: OpportunitySectionProps) {
  const { applications } = useMyTournamentApplications();

  // P3 (팀장)만 CTA 표시
  if (persona !== "P3") {
    return null;
  }

  // 이 대회에 대한 신청 찾기
  const myApplication = applications.find(
    (app) =>
      app.associationId === associationId && app.tournamentId === tournamentId
  );

  return (
    <section className="px-4 mt-6 space-y-3">
      <ApplyTournamentCard
        onClick={onApply}
        hasApplication={!!myApplication}
        applicationStatus={myApplication?.status}
      />
    </section>
  );
}
