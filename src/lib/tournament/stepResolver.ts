/**
 * 🔥 STEP A / STEP B 자동 분기 로직 (핵심 뇌)
 * 
 * 철학: 모든 페이지는 "상태를 가정하지 않는다"
 * 모든 단계는 "서버 상태만을 진실로 본다"
 * 
 * 이 함수는 /me, /dashboard, /ops, 로그인 직후 redirect 전부에서 재사용
 */

import { MIN_PLAYERS } from "@/constants/rosterPolicy";

/**
 * 🔥 단 하나의 진실 소스: 서버에서 내려준 팀 + 선수 수
 */
export type MyTeamState = {
  hasTeam: boolean;
  playerCount: number;
};

/**
 * STEP 정의 (불변)
 * - STEP A = "팀/선수 준비 단계"
 * - STEP B = "대회 운영 단계"
 */
export type StepResult = 
  | "STEP_A_CREATE_TEAM"      // 팀 없음
  | "STEP_A_FILL_PLAYERS"     // 팀 있음, 선수 부족
  | "STEP_B_READY";           // 팀 있음, 선수 충족

/**
 * 🔀 자동 분기 로직 (프론트 공통)
 * 
 * 조건:
 * - STEP A: 팀 ❌ 또는 선수 수 < 최소 인원
 * - STEP B: 팀 있음 && 선수 수 ≥ 최소 인원
 */
export function resolveMyStep(state: MyTeamState): StepResult {
  // 1. 팀 없음 → 팀 생성 필요
  if (!state.hasTeam) {
    return "STEP_A_CREATE_TEAM";
  }

  // 2. 팀 있음, 선수 부족 → 선수 입력 필요
  if (state.playerCount < MIN_PLAYERS) {
    return "STEP_A_FILL_PLAYERS";
  }

  // 3. 팀 있음, 선수 충족 → 대회 운영 준비 완료
  return "STEP_B_READY";
}

/**
 * 🧠 UX 매핑: StepResult → 사용자에게 보이는 행동
 */
export function getStepActionLabel(step: StepResult): string {
  switch (step) {
    case "STEP_A_CREATE_TEAM":
      return "팀 만들기";
    case "STEP_A_FILL_PLAYERS":
      return "선수 명단 입력 필요";
    case "STEP_B_READY":
      return "대회 관리 / 참가 리스트";
    default:
      return "준비 중";
  }
}

/**
 * 🧠 UX 메시지: StepResult → 상세 안내
 */
export function getStepMessage(step: StepResult, playerCount?: number): string {
  switch (step) {
    case "STEP_A_CREATE_TEAM":
      return "팀을 먼저 생성해주세요.";
    case "STEP_A_FILL_PLAYERS":
      return `선수 ${playerCount || 0}/${MIN_PLAYERS}명 필요`;
    case "STEP_B_READY":
      return "대회에 참가할 준비가 되었습니다.";
    default:
      return "준비 중";
  }
}
