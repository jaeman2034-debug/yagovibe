/**
 * 🔥 OpportunitySection - 선택적 액션 유도 영역
 * 
 * STEP 7 설계 원칙:
 * - 여기서만 CTA를 노출한다
 * - PersonaSection에는 절대 침범하지 않는다
 * - "해야 합니다" 금지 / "할 수 있어요"만 허용
 * - 메인 메시지 없음 / 상태 판단 로직 없음
 * 
 * P1-W 상태 추가:
 * - 가입 요청 대기 중일 때 PendingRequestCard 표시
 * - P1-A (팀 없음)와 구분
 */

import type { Persona } from "@/components/ui/personas/types";
import { JoinTeamCard } from "./opportunity/JoinTeamCard";
import { CreateTeamCard } from "./opportunity/CreateTeamCard";
import { ApplyTournamentCard } from "./opportunity/ApplyTournamentCard";
import { PendingRequestCard } from "./opportunity/PendingRequestCard";
import { useMyPendingJoinRequests } from "@/hooks/useMyPendingJoinRequests";

interface OpportunitySectionProps {
  persona: Persona;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onApplyTournament: () => void;
}

/**
 * 🔥 OpportunitySection 컴포넌트
 * 
 * STEP 7 Persona별 매핑:
 * - P1-A (팀 없음): JoinTeamCard + CreateTeamCard
 * - P1-W (가입 요청 대기 중): PendingRequestCard
 * - P3: ApplyTournamentCard
 * - P0, P2, P4: null (PersonaSection에서 처리)
 */
export function OpportunitySection({
  persona,
  onCreateTeam,
  onJoinTeam,
  onApplyTournament,
}: OpportunitySectionProps) {
  // 🔥 P1-W 상태 확인: 가입 요청 대기 중
  const { pendingRequest, hasPendingRequest, loading: pendingLoading } = useMyPendingJoinRequests();

  // P1: 팀에 소속되기 또는 팀 만들기
  const showP1Opportunity = persona === "P1";
  const isP1Waiting = showP1Opportunity && hasPendingRequest; // P1-W
  const isP1Available = showP1Opportunity && !hasPendingRequest && !pendingLoading; // P1-A

  // P3: 대회 참가
  const showP3Opportunity = persona === "P3";

  // CTA가 없으면 렌더링하지 않음
  if (!showP1Opportunity && !showP3Opportunity) {
    return null;
  }

  return (
    <section className="px-4 pt-20 pb-6 space-y-3">
      {/* P1-W: 가입 요청 대기 중 */}
      {isP1Waiting && pendingRequest && (
        <PendingRequestCard
          request={pendingRequest}
          onCanceled={() => {
            // 취소 후 자동으로 P1-A로 전이됨 (useMyPendingJoinRequests가 실시간 업데이트)
          }}
        />
      )}

      {/* P1-A: 팀 없음 - 팀 만들기/찾기 CTA */}
      {isP1Available && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              팀에 소속되기
            </h3>
            <p className="text-sm text-gray-600">
              아직 소속된 팀이 없어요. 아래 중 하나를 선택하세요.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <CreateTeamCard onClick={onCreateTeam} />
            </div>
            <div className="flex-1">
              <JoinTeamCard onClick={onJoinTeam} />
            </div>
          </div>
        </div>
      )}

      {/* P3: 대회 참가 */}
      {showP3Opportunity && <ApplyTournamentCard onClick={onApplyTournament} />}
    </section>
  );
}
