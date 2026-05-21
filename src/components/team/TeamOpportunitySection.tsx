/**
 * 🔥 TeamOpportunitySection - 팀 페이지 선택적 액션 유도 영역 (STEP 14)
 * 
 * STEP 14 설계 원칙:
 * - 여기서만 CTA를 노출한다
 * - PersonaSection에는 절대 침범하지 않는다
 * - "해야 합니다" 금지 / "할 수 있어요"만 허용
 * - 메인 메시지 없음 / 상태 판단 로직 없음
 */

import type { Persona } from "@/pages/me/resolvePersona";
import { JoinTeamCard } from "@/components/me/opportunity/JoinTeamCard";
import { CreateTeamCard } from "@/components/me/opportunity/CreateTeamCard";
import { ApplyTournamentCard } from "@/components/me/opportunity/ApplyTournamentCard";

interface TeamOpportunitySectionProps {
  persona: Persona;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onApplyTournament: () => void;
}

/**
 * 🔥 TeamOpportunitySection 컴포넌트
 * 
 * STEP 14 Persona별 매핑:
 * - P1: JoinTeamCard 또는 CreateTeamCard (택 1)
 * - P3: ApplyTournamentCard
 * - P0, P2, P4: null (PersonaSection에서 처리)
 */
export function TeamOpportunitySection({
  persona,
  onCreateTeam,
  onJoinTeam,
  onApplyTournament,
}: TeamOpportunitySectionProps) {
  // P1: 팀에 소속되기 또는 팀 만들기 (택 1 전략)
  // 🔥 현재는 JoinTeamCard만 노출 (나중에 A/B 테스트 가능)
  const showP1Opportunity = persona === "P1";
  const showJoinTeam = showP1Opportunity; // 기본값: JoinTeamCard
  // const showCreateTeam = showP1Opportunity && false; // A/B 테스트용

  // P3: 대회 참가
  const showP3Opportunity = persona === "P3";

  // CTA가 없으면 렌더링하지 않음
  if (!showJoinTeam && !showP3Opportunity) {
    return null;
  }

  return (
    <section className="px-4 mt-6 space-y-3">
      {/* P1: 팀에 소속되기 */}
      {showJoinTeam && <JoinTeamCard onClick={onJoinTeam} />}

      {/* P1: 팀 만들기 (A/B 테스트용, 현재 비활성화) */}
      {/* {showCreateTeam && <CreateTeamCard onClick={onCreateTeam} />} */}

      {/* P3: 대회 참가 */}
      {showP3Opportunity && <ApplyTournamentCard onClick={onApplyTournament} />}
    </section>
  );
}
