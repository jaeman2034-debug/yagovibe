/**
 * 🔥 Weekly Stats 집계 함수
 * 
 * 역할:
 * - 주별 통계 집계
 * - platform_weekly_stats/{weekId} 문서 생성/업데이트
 * - Matches, Goals 주별 집계
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export interface WeeklyStats {
  week: string; // "2026-W12"
  weekStart: any; // Timestamp
  weekEnd: any; // Timestamp
  matches: number;
  goals: number;
  newPlayers: number;
  newTeams: number;
  updatedAt: any;
}

/**
 * 주 번호 계산 (ISO 8601 기준)
 */
function getWeekNumber(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * 특정 주의 통계 집계
 */
export async function updateWeeklyStats(targetWeek?: string): Promise<void> {
  try {
    const now = new Date();
    let weekStart: Date;
    let weekEnd: Date;
    let weekStr: string;

    if (targetWeek) {
      // "2026-W12" 형식 파싱
      const [yearStr, weekStrPart] = targetWeek.split("-W");
      const year = parseInt(yearStr);
      const week = parseInt(weekStrPart);

      // 주 시작일 계산 (월요일)
      const jan4 = new Date(year, 0, 4);
      const jan4Day = jan4.getDay() || 7;
      const weekStartDate = new Date(year, 0, 4 - jan4Day + 1 + (week - 1) * 7);
      weekStart = new Date(weekStartDate);
      weekEnd = new Date(weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      weekStr = targetWeek;
    } else {
      // 현재 주
      const { year, week } = getWeekNumber(now);
      weekStr = `${year}-W${String(week).padStart(2, "0")}`;

      // 이번 주 월요일
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
      weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);

      // 이번 주 일요일
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
    }

    logger.info("🔄 [updateWeeklyStats] 주별 통계 집계 시작:", { weekStr });

    const weekStartTs = admin.firestore.Timestamp.fromDate(weekStart);
    const weekEndTs = admin.firestore.Timestamp.fromDate(weekEnd);

    // 이번 주 생성된 항목 조회
    const [matchesSnap, playerGamesSnap, teamsSnap, playersSnap] =
      await Promise.all([
        db
          .collection("event_matches")
          .where("createdAt", ">=", weekStartTs)
          .where("createdAt", "<=", weekEndTs)
          .get(),
        db
          .collection("player_games")
          .where("createdAt", ">=", weekStartTs)
          .where("createdAt", "<=", weekEndTs)
          .get(),
        db
          .collection("teams")
          .where("createdAt", ">=", weekStartTs)
          .where("createdAt", "<=", weekEndTs)
          .get(),
        db
          .collection("players")
          .where("createdAt", ">=", weekStartTs)
          .where("createdAt", "<=", weekEndTs)
          .get(),
      ]);

    const matches = matchesSnap.size;
    const newTeams = teamsSnap.size;
    const newPlayers = playersSnap.size;

    // 이번 주 득점 집계
    let goals = 0;
    playerGamesSnap.forEach((doc) => {
      const data = doc.data();
      goals += data.goals || 0;
    });

    // platform_weekly_stats/{weekId} 업데이트
    const statsRef = db.doc(`platform_weekly_stats/${weekStr}`);
    const stats: WeeklyStats = {
      week: weekStr,
      weekStart: weekStartTs,
      weekEnd: weekEndTs,
      matches,
      goals,
      newPlayers,
      newTeams,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await statsRef.set(stats, { merge: true });

    logger.info("✅ [updateWeeklyStats] 주별 통계 업데이트 완료:", {
      weekStr,
      matches,
      goals,
      newPlayers,
      newTeams,
    });
  } catch (error: any) {
    logger.error("❌ [updateWeeklyStats] 집계 실패:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 최근 N주 통계 집계
 */
export async function updateRecentWeeklyStats(weeks: number = 12): Promise<void> {
  try {
    const now = new Date();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < weeks; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i * 7);

      const { year, week } = getWeekNumber(targetDate);
      const weekStr = `${year}-W${String(week).padStart(2, "0")}`;

      promises.push(updateWeeklyStats(weekStr));
    }

    await Promise.all(promises);

    logger.info("✅ [updateRecentWeeklyStats] 최근 주별 통계 업데이트 완료:", {
      weeks,
    });
  } catch (error: any) {
    logger.error("❌ [updateRecentWeeklyStats] 집계 실패:", {
      error: error.message,
    });
    throw error;
  }
}
