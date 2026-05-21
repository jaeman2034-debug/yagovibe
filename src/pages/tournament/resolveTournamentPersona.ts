/**
 * 🔥 대회 컨텍스트 Persona 판별 (STEP 15A)
 * 
 * 대회 페이지에서 유저-대회 관계를 판별
 * 
 * Persona:
 * - P1: 개인 체육인 (팀·대회 없음)
 * - P2: 팀 소속 선수 (미신청)
 * - P3: 팀장 (신청 가능)
 * - P4: 관리자
 */

import type { Persona } from "@/pages/me/resolvePersona";

export interface ResolveTournamentPersonaInput {
  isLoggedIn: boolean;
  isAdmin: boolean;
  hasTeams: boolean;
  isTeamCaptain: boolean;
  hasApplication: boolean; // 이 대회에 신청했는지
}

/**
 * 🔥 대회 컨텍스트 Persona 판별
 * 
 * 우선순위: P4 > P3 > P2 > P1
 */
export function resolveTournamentPersona({
  isLoggedIn,
  isAdmin,
  hasTeams,
  isTeamCaptain,
  hasApplication,
}: ResolveTournamentPersonaInput): Persona {
  if (!isLoggedIn) return "P1"; // 비로그인도 P1로 처리 (정보 소비자)

  if (isAdmin) return "P4";

  if (isTeamCaptain && hasTeams) return "P3";

  if (hasTeams && !hasApplication) return "P2";

  return "P1";
}
