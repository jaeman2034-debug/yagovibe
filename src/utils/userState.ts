/**
 * 🔥 유저 상태 머신 (State Machine) - 단일 진실 소스
 * 
 * 핵심 원칙:
 * - "지금 이 유저는 무엇을 할 수 있는가"의 단일 진실
 * - 조건 분기 혼란 끝
 * - 이후 기능 추가 속도 2배 이상 빨라짐
 * 
 * 상태 정의:
 * - P1-A: 팀 없음 (Available)
 * - P1-W: 가입 요청 대기 중 (Waiting)
 * - P2: 팀원 (Member)
 * - P3: 팀장 (Captain)
 */

import type { TeamMember } from "@/hooks/useMyTeams";
import type { TeamJoinRequest } from "@/lib/team/teamJoinRequest";

/**
 * 유저 상태 타입
 */
export type UserState = "P1-A" | "P1-W" | "P2" | "P3";

/**
 * 유저 상태 계산 입력값
 */
export interface GetUserStateInput {
  teams: TeamMember[];
  pendingRequests: TeamJoinRequest[];
}

/**
 * 🔥 유저 상태 계산 함수 (단일 진실 소스)
 * 
 * 우선순위:
 * 1. 팀이 있으면 → P2 또는 P3 (팀장 여부 확인)
 * 2. 팀이 없고 가입 요청이 있으면 → P1-W
 * 3. 그 외 → P1-A
 * 
 * @param input - 팀 목록과 가입 요청 목록
 * @returns UserState
 */
export function getUserState({ teams, pendingRequests }: GetUserStateInput): UserState {
  // 팀이 있으면 → P2 또는 P3
  if (teams.length > 0) {
    const isCaptain = teams.some(
      (t) => t.role === "admin" || t.role === "owner" || t.accessLevel === "OWNER"
    );
    return isCaptain ? "P3" : "P2";
  }

  // 팀이 없고 가입 요청이 있으면 → P1-W
  if (pendingRequests.length > 0) {
    return "P1-W";
  }

  // 그 외 → P1-A
  return "P1-A";
}

/**
 * 상태 전이 다이어그램 (문서화)
 * 
 * P1-A
 *  ├─ 팀 만들기 ─────────▶ P3
 *  └─ 팀 가입 요청 ───────▶ P1-W
 *                              │
 *                              ├─ 승인 ─▶ P2
 *                              └─ 거절/취소 ─▶ P1-A
 * 
 * P2
 *  ├─ 팀장 위임 받음 ─────▶ P3
 *  └─ 추방 ─────────────▶ P1-A
 * 
 * P3
 *  └─ 팀장 위임 ─────────▶ P2
 */

/**
 * 상태별 가능한 행동 (문서화)
 */
export const USER_STATE_ACTIONS = {
  "P1-A": {
    canCreateTeam: true,
    canJoinTeam: true,
    canManageTeam: false,
    canViewTeam: false,
  },
  "P1-W": {
    canCreateTeam: false,
    canJoinTeam: false,
    canManageTeam: false,
    canViewTeam: false,
    canCancelRequest: true,
  },
  "P2": {
    canCreateTeam: false,
    canJoinTeam: false,
    canManageTeam: false,
    canViewTeam: true,
  },
  "P3": {
    canCreateTeam: false,
    canJoinTeam: false,
    canManageTeam: true,
    canViewTeam: true,
  },
} as const;

/**
 * 상태별 설명 (UI 메시지용)
 */
export const USER_STATE_LABELS = {
  "P1-A": "팀 없음",
  "P1-W": "가입 요청 대기 중",
  "P2": "팀원",
  "P3": "팀장",
} as const;
