/**
 * 🔥 관리자 / 실유저 공용 플로우 (천재 설계 포인트)
 * 
 * 핵심 원칙:
 * - 관리자와 유저는 "같은 상태 머신"을 본다
 * - 단, "할 수 있는 액션만 다르다"
 */

import { StepResult } from "./stepResolver";

/**
 * 🧩 공용 상태 모델
 */
export type TournamentViewState = {
  step: "STEP_A" | "STEP_B";
  reason?: "NO_TEAM" | "NOT_ENOUGH_PLAYERS";
  actions: string[];
};

/**
 * 🎭 역할별 액션 타입
 */
export type UserRole = "TEAM_REP" | "ADMIN";

/**
 * 🎭 역할별 액션 매핑
 */
export const ROLE_ACTIONS: Record<UserRole, string[]> = {
  // 실유저 (팀 대표)
  TEAM_REP: ["CREATE_TEAM", "ADD_PLAYERS"],
  
  // 관리자
  ADMIN: ["VIEW_TEAM_STATUS", "LOCK_ROSTER", "RUN_DRAW"],
};

/**
 * 🔀 StepResult → TournamentViewState 변환
 */
export function stepToViewState(step: StepResult): TournamentViewState {
  switch (step) {
    case "STEP_A_CREATE_TEAM":
      return {
        step: "STEP_A",
        reason: "NO_TEAM",
        actions: [],
      };
    case "STEP_A_FILL_PLAYERS":
      return {
        step: "STEP_A",
        reason: "NOT_ENOUGH_PLAYERS",
        actions: [],
      };
    case "STEP_B_READY":
      return {
        step: "STEP_B",
        actions: [],
      };
  }
}

/**
 * 🔀 역할별 사용 가능한 액션 필터링
 */
export function getAvailableActions(
  viewState: TournamentViewState,
  role: UserRole
): string[] {
  const roleActions = ROLE_ACTIONS[role];
  
  // STEP A에서는 관리자도 제한된 액션만 가능
  if (viewState.step === "STEP_A") {
    if (role === "ADMIN") {
      return roleActions.filter((action) => 
        action === "VIEW_TEAM_STATUS"
      );
    }
    // TEAM_REP은 STEP A에서 CREATE_TEAM, ADD_PLAYERS 가능
    return roleActions;
  }
  
  // STEP B에서는 모든 액션 가능
  return roleActions;
}

/**
 * 🔒 액션 실행 가능 여부 체크
 */
export function canExecuteAction(
  action: string,
  viewState: TournamentViewState,
  role: UserRole
): boolean {
  const availableActions = getAvailableActions(viewState, role);
  return availableActions.includes(action);
}
