/**
 * 🔥 TeamPersonaP1Individual - 팀 없는 개인 체육인 (STEP 14)
 * 
 * 핵심 원칙:
 * - 팀 강요 없음
 * - "아직 소속된 팀은 없어요" ❌ (금지)
 * - 팀이란 무엇인가
 * - 팀에 소속되면 가능한 것
 * - 팀 찾기 안내
 */

import { Users, Trophy, Calendar } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";
import type { PersonaData } from "@/hooks/useMePersona";

interface TeamPersonaP1IndividualProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

/**
 * 🔥 팀 없는 개인 체육인 UI
 * 
 * STEP 14 설계:
 * - info 카드: "팀에 소속되면 이런 활동을 할 수 있어요"
 * - hint 카드: "팀은 선택 사항이에요"
 */
export function TeamPersonaP1Individual({ personaData, navigate }: TeamPersonaP1IndividualProps) {
  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 1️⃣ 팀 활동 안내 카드 */}
      <MeCard
        variant="info"
        icon={<Users className="w-5 h-5" />}
        title="팀에 소속되면 이런 활동을 할 수 있어요"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">대회 참가</p>
              <p className="text-xs text-gray-600">팀으로 대회에 참가할 수 있어요</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">팀 일정 관리</p>
              <p className="text-xs text-gray-600">팀원들과 일정을 공유하고 관리할 수 있어요</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">팀원과 소통</p>
              <p className="text-xs text-gray-600">팀원들과 함께 활동하고 소통할 수 있어요</p>
            </div>
          </div>
        </div>
      </MeCard>

      {/* 2️⃣ 팀 선택 안내 카드 */}
      <MeCard
        variant="hint"
        icon={<Users className="w-5 h-5" />}
        title="팀은 선택 사항이에요"
      >
        <p className="text-sm text-gray-700">
          팀에 소속되지 않아도 개인 활동을 계속할 수 있어요. 
          팀은 필요할 때 선택할 수 있는 옵션입니다.
        </p>
      </MeCard>
    </section>
  );
}
