/**
 * 🔥 팀 탐색 페이지 (STEP: 팀원 가입 플로우)
 * 
 * `/team/search` · `/teams/find` (라우트에서 동일 페이지)
 * 
 * 한 문장 정의: "팀이 없는 개인 체육인(P1)이 부담 없이 팀을 찾고, 가입 요청까지 할 수 있는 정상 경로"
 * 
 * 페이지 전제 상태:
 * - Persona: P1 (개인 체육인)
 * - 프로필: 완료됨
 * - 의도: 팀 참여
 * - 데이터 상태: 팀 0개 → 정상
 * 
 * HubLayout 3-Layer 구조:
 * - IdentityHeader: "팀 찾기" + "원하는 팀에 참여할 수 있어요"
 * - PersonaSection: FilterBar + TeamList (P1 전용)
 * - OpportunitySection: 없음
 * 
 * ❌ 에러 페이지 아님
 * ❌ 팀 없는 유저 차별 ❌
 * ❌ "팀 먼저 만드세요" ❌
 */

import { HubLayout } from "@/components/ui/layout/HubLayout";
import { PersonaSection } from "@/components/ui/layout/PersonaSection";
import { TeamSearchIdentityHeader } from "@/components/team/TeamSearchIdentityHeader";
import { PersonaP1TeamSearch } from "@/components/team/PersonaP1TeamSearch";
import type { Persona } from "@/components/ui/personas/types";

export default function TeamSearchPage() {
  // 이 페이지는 P1 전용이므로 Persona는 항상 P1
  const persona: Persona = "P1";

  return (
    <HubLayout
      header={<TeamSearchIdentityHeader />}
      persona={
        <PersonaSection
          persona={persona}
          map={{
            P0: null, // P0는 이 페이지에 접근 불가
            P1: <PersonaP1TeamSearch />,
            P2: null, // P2는 이미 팀이 있음
            P3: null, // P3는 이미 팀장
            P4: null, // P4는 관리자
          }}
        />
      }
      // OpportunitySection 없음
    />
  );
}
