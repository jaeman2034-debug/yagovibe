/**
 * 🔥 STEP A / STEP B 자동 분기 조건 체크 유틸리티
 * 
 * 목표: 팀 생성 → 선수 입력 → 관리자 승인 → Phase 전환 자동 분기
 * 
 * STEP A 조건: 팀 생성 + 선수 입력 완료 (팀 대표가 완료)
 * STEP B 조건: 승인된 팀 수 >= 1, 모든 승인 팀의 선수 수 >= MIN_PLAYERS
 */

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MIN_PLAYERS, MAX_PLAYERS } from "@/constants/rosterPolicy";

export interface StepAConditions {
  /** 팀이 생성되었는지 */
  hasTeam: boolean;
  /** 선수 수가 최소 인원을 충족하는지 */
  hasMinimumPlayers: boolean;
  /** 현재 선수 수 */
  currentPlayerCount: number;
  /** 최소 필요 선수 수 */
  minRequiredPlayers: number;
  /** 모든 조건 충족 여부 */
  allConditionsMet: boolean;
  /** 조건 미충족 이유 */
  reason?: string;
}

export interface StepBConditions {
  /** 승인된 팀 수 */
  approvedTeamsCount: number;
  /** 최소 필요 승인 팀 수 */
  minRequiredTeams: number;
  /** 승인된 팀 목록 (선수 수 검증용) */
  approvedTeams: Array<{
    teamId: string;
    teamName: string;
    playerCount: number;
    isValid: boolean; // 선수 수 조건 충족 여부
  }>;
  /** 모든 승인 팀의 선수 수가 충족되는지 */
  allTeamsHaveValidPlayers: boolean;
  /** 모든 조건 충족 여부 */
  allConditionsMet: boolean;
  /** 조건 미충족 이유 */
  reason?: string;
}

/**
 * 🔥 STEP A 조건 체크 (팀 대표용)
 * 
 * 조건:
 * 1. 팀이 생성되어 있음
 * 2. 선수 수 >= MIN_PLAYERS
 */
export async function checkStepAConditions(
  teamId: string | null | undefined
): Promise<StepAConditions> {
  // 기본값 (조건 미충족)
  const defaultResult: StepAConditions = {
    hasTeam: false,
    hasMinimumPlayers: false,
    currentPlayerCount: 0,
    minRequiredPlayers: MIN_PLAYERS,
    allConditionsMet: false,
    reason: "팀이 생성되지 않았습니다.",
  };

  // 1. 팀 존재 여부 확인
  if (!teamId) {
    return defaultResult;
  }

  try {
    // 2. 선수 수 조회
    const playersRef = collection(db, `teams/${teamId}/members`);
    const playersSnap = await getDocs(playersRef);
    const playerCount = playersSnap.size;

    const hasMinimumPlayers = playerCount >= MIN_PLAYERS;
    const allConditionsMet = hasMinimumPlayers;

    return {
      hasTeam: true,
      hasMinimumPlayers,
      currentPlayerCount: playerCount,
      minRequiredPlayers: MIN_PLAYERS,
      allConditionsMet,
      reason: allConditionsMet
        ? undefined
        : `선수 수가 부족합니다. (현재: ${playerCount}명, 필요: ${MIN_PLAYERS}명 이상)`,
    };
  } catch (error) {
    console.error("[checkStepAConditions] 오류:", error);
    return {
      ...defaultResult,
      reason: "팀 정보를 확인할 수 없습니다.",
    };
  }
}

/**
 * 🔥 STEP B 조건 체크 (관리자용)
 * 
 * 조건:
 * 1. 승인된 팀 수 >= 1
 * 2. 모든 승인 팀의 선수 수 >= MIN_PLAYERS
 */
export async function checkStepBConditions(
  associationId: string,
  tournamentId: string
): Promise<StepBConditions> {
  const minRequiredTeams = 1; // 최소 1팀 필요

  try {
    // 1. 승인된 팀 목록 조회
    const teamsRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/teams`
    );
    const teamsQuery = query(teamsRef, where("status", "==", "APPROVED"));
    const teamsSnap = await getDocs(teamsQuery);

    const approvedTeamsCount = teamsSnap.size;

    // 2. 각 팀의 선수 수 확인
    const approvedTeams: StepBConditions["approvedTeams"] = [];
    let allTeamsHaveValidPlayers = true;

    for (const teamDoc of teamsSnap.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      const teamName = teamData.teamName || teamData.name || "팀명 없음";

      try {
        // 팀의 선수 수 조회 (teams/{teamId}/players 또는 teams/{teamId}/members)
        // 실제 데이터 구조에 맞게 수정 필요
        const playersRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/teams/${teamId}/players`
        );
        const playersSnap = await getDocs(playersRef);
        const playerCount = playersSnap.size;

        const isValid = playerCount >= MIN_PLAYERS;
        if (!isValid) {
          allTeamsHaveValidPlayers = false;
        }

        approvedTeams.push({
          teamId,
          teamName,
          playerCount,
          isValid,
        });
      } catch (error) {
        console.error(`[checkStepBConditions] 팀 ${teamId} 선수 수 조회 실패:`, error);
        // 조회 실패 시 유효하지 않은 것으로 간주
        allTeamsHaveValidPlayers = false;
        approvedTeams.push({
          teamId,
          teamName,
          playerCount: 0,
          isValid: false,
        });
      }
    }

    // 3. 최종 조건 충족 여부
    const hasMinimumTeams = approvedTeamsCount >= minRequiredTeams;
    const allConditionsMet = hasMinimumTeams && allTeamsHaveValidPlayers;

    // 4. 조건 미충족 이유 생성
    let reason: string | undefined;
    if (!allConditionsMet) {
      if (!hasMinimumTeams) {
        reason = `승인된 팀이 부족합니다. (현재: ${approvedTeamsCount}팀, 필요: ${minRequiredTeams}팀 이상)`;
      } else if (!allTeamsHaveValidPlayers) {
        const invalidTeams = approvedTeams.filter((t) => !t.isValid);
        reason = `다음 팀의 선수 수가 부족합니다: ${invalidTeams.map((t) => t.teamName).join(", ")} (각 팀 최소 ${MIN_PLAYERS}명 필요)`;
      }
    }

    return {
      approvedTeamsCount,
      minRequiredTeams,
      approvedTeams,
      allTeamsHaveValidPlayers,
      allConditionsMet,
      reason,
    };
  } catch (error) {
    console.error("[checkStepBConditions] 오류:", error);
    return {
      approvedTeamsCount: 0,
      minRequiredTeams,
      approvedTeams: [],
      allTeamsHaveValidPlayers: false,
      allConditionsMet: false,
      reason: "승인된 팀 정보를 확인할 수 없습니다.",
    };
  }
}
