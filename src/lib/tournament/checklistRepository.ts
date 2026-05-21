/**
 * 🔥 운영 체크리스트 계산 Repository
 * Step 1: 운영 체크리스트 자동화
 */

import type { TournamentDashboardStats } from "@/types/tournament";
import { getTournamentStats } from "./tournamentRepository";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOURNAMENT_COLLECTIONS } from "./constants";

/**
 * 참가 승인 수 조회 (QR 준비 체크용)
 */
async function getApprovedApplicationCount(
  associationId: string,
  tournamentId: string
): Promise<number> {
  try {
    const applicationsRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/applications`
    );
    const q = query(applicationsRef, where("status", "==", "APPROVED"));
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error("참가 승인 수 조회 오류:", error);
    return 0;
  }
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  message: string;
  count?: number;
}

export interface TournamentChecklist {
  items: ChecklistItem[];
  allOk: boolean;
  warningCount: number;
  errorCount: number;
}

/**
 * 오늘 날짜의 dateKey 생성 (YYYY-MM-DD)
 */
function getTodayDateKey(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 대회 운영 체크리스트 계산
 */
export async function getTournamentChecklist(
  associationId: string,
  tournamentId: string
): Promise<TournamentChecklist> {
  const dateKey = getTodayDateKey();
  const stats = await getTournamentStats(associationId, tournamentId, dateKey);
  const approvedApplicationCount = await getApprovedApplicationCount(
    associationId,
    tournamentId
  );

  const items: ChecklistItem[] = [];

  // 1. 오늘 경기 편성 완료 여부
  if (stats) {
    if (stats.todayMatchCount > 0) {
      items.push({
        id: "matches_scheduled",
        label: "경기 편성 완료",
        status: "ok",
        message: `오늘 경기 ${stats.todayMatchCount}경기 편성 완료`,
        count: stats.todayMatchCount,
      });
    } else {
      items.push({
        id: "matches_scheduled",
        label: "경기 편성 완료",
        status: "warning",
        message: "오늘 예정된 경기가 없습니다",
        count: 0,
      });
    }

    // 2. 미배정 심판 경기 수
    if (stats.unassignedRefMatchCount > 0) {
      items.push({
        id: "unassigned_referees",
        label: "심판 배정 완료",
        status: "warning",
        message: `미배정 심판 ${stats.unassignedRefMatchCount}경기`,
        count: stats.unassignedRefMatchCount,
      });
    } else {
      items.push({
        id: "unassigned_referees",
        label: "심판 배정 완료",
        status: "ok",
        message: "모든 경기 심판 배정 완료",
        count: 0,
      });
    }

    // 3. 미검인 선수 수
    if (stats.uncheckedPlayerCount > 0) {
      items.push({
        id: "unchecked_players",
        label: "선수 검인 완료",
        status: "warning",
        message: `미검인 선수 ${stats.uncheckedPlayerCount}명`,
        count: stats.uncheckedPlayerCount,
      });
    } else {
      items.push({
        id: "unchecked_players",
        label: "선수 검인 완료",
        status: "ok",
        message: "모든 선수 검인 완료",
        count: 0,
      });
    }
  } else {
    // stats가 없으면 아직 데이터가 없는 상태
    items.push({
      id: "matches_scheduled",
      label: "경기 편성 완료",
      status: "warning",
      message: "경기 데이터가 없습니다",
      count: 0,
    });
  }

  // 4. QR 발급 준비 완료 여부 (참가 승인 수 확인)
  if (approvedApplicationCount > 0) {
    items.push({
      id: "qr_ready",
      label: "QR 발급 준비 완료",
      status: "ok",
      message: `참가 승인 ${approvedApplicationCount}건 완료`,
      count: approvedApplicationCount,
    });
  } else {
    items.push({
      id: "qr_ready",
      label: "QR 발급 준비 완료",
      status: "warning",
      message: "참가 승인이 없습니다",
      count: 0,
    });
  }

  const warningCount = items.filter((item) => item.status === "warning").length;
  const errorCount = items.filter((item) => item.status === "error").length;
  const allOk = warningCount === 0 && errorCount === 0;

  return {
    items,
    allOk,
    warningCount,
    errorCount,
  };
}

