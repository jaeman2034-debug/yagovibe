/**
 * 🔥 ActivityHintCard - 활동 힌트 카드 (STEP 9: variant="hint")
 * 
 * STEP 9 디자인 시스템:
 * - variant: hint (안내/맥락 제공, 배경 연함, 버튼 없음)
 * - PersonaSection 전용
 */
import { Lightbulb, Users, Trophy } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";

interface ActivityHintCardProps {
  onExploreTeams?: () => void;
  onExploreTournaments?: () => void;
}

/**
 * 🔥 활동 힌트 카드
 * 
 * PR 4 설계 원칙:
 * - PersonaSection에 위치하지만 실제 CTA는 OpportunitySection에서 제공
 * - 여기서는 단순히 정보 제공
 * - CTA ❌ / 강요 ❌ / 안내만
 * - props 없이도 렌더링 가능
 */
export function ActivityHintCard({
  onExploreTeams,
  onExploreTournaments,
}: ActivityHintCardProps = {}) {
  return (
    <MeCard
      variant="hint"
      icon={<Lightbulb className="w-5 h-5" />}
      title="다양한 활동을 시작해보세요"
    >
      {/* 힌트 목록 */}
      <div className="space-y-3">
        {/* 팀 소속 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              팀에 소속되어 함께 활동할 수 있어요
            </p>
            {/* PR 4: CTA 제거 (OpportunitySection에서만 제공) */}
          </div>
        </div>

        {/* 대회 정보 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              대회 정보를 살펴볼 수 있어요
            </p>
            {/* PR 4: CTA 제거 (OpportunitySection에서만 제공) */}
          </div>
        </div>
      </div>
    </MeCard>
  );
}
