/**
 * 🔥 공용 OpportunitySection (STEP 15B: CTA 봉인)
 * 
 * CTA 위치 강제
 * - 페이지별 CTA 차이만 map으로 제어
 * - PersonaSection에 CTA 넣으면 안 됨
 */

import { ReactNode } from "react";
import type { Persona } from "../personas/types";

interface OpportunitySectionProps {
  persona: Persona;
  map: Partial<Record<Persona, ReactNode>>;
}

/**
 * 🔥 OpportunitySection 컴포넌트
 * 
 * 사용 예:
 * <OpportunitySection
 *   persona={persona}
 *   map={{
 *     P1: <JoinTeamCard />,
 *     P3: <ApplyTournamentCard />,
 *   }}
 * />
 */
export function OpportunitySection({
  persona,
  map,
}: OpportunitySectionProps) {
  const content = map[persona];
  if (!content) return null;

  return <section className="px-4 mt-6 space-y-3">{content}</section>;
}
