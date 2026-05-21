/**
 * 🔥 공용 PersonaSection (STEP 15B)
 * 
 * Persona → View 매핑을 중앙화
 * - 페이지별 Persona 컴포넌트만 map으로 전달
 * - Persona 확장 시 한 군데만 수정
 */

import { ReactNode } from "react";
import type { Persona } from "../personas/types";

interface PersonaSectionProps {
  persona: Persona;
  map: Record<Persona, ReactNode>;
}

/**
 * 🔥 PersonaSection 컴포넌트
 * 
 * 사용 예:
 * <PersonaSection
 *   persona={persona}
 *   map={{
 *     P0: <P0_NewUser />,
 *     P1: <P1_Individual />,
 *     P2: <P2_Player />,
 *     P3: <P3_TeamLeader />,
 *     P4: <P4_Admin />,
 *   }}
 * />
 */
export function PersonaSection({ persona, map }: PersonaSectionProps) {
  return <>{map[persona] ?? null}</>;
}
