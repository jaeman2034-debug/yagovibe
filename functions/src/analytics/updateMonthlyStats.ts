/**
 * 🔥 Monthly Stats 집계 함수
 * 
 * 역할:
 * - 월별 통계 집계
 * - platform_monthly_stats/{month} 문서 생성/업데이트
 * - Events, Teams, Players, Matches, Goals 월별 집계
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export interface MonthlyStats {
  month: string; // "2026-03"
  events: number;
  newTeams: number;
  newPlayers: number;
  matches: number;
  goals: number;
  updatedAt: any;
}

/**
 * 특정 월의 통계 집계
 */
export async function updateMonthlyStats(targetMonth?: string): Promise<void> {
  try {
    const now = new Date();
    const target = targetMonth
      ? new Date(targetMonth + "-01")
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const year = target.getFullYear();
    const month = target.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    logger.info("🔄 [updateMonthlyStats] 월별 통계 집계 시작:", { monthStr });

    const monthStart = admin.firestore.Timestamp.fromDate(
      new Date(year, month - 1, 1)
    );
    const monthEnd = admin.firestore.Timestamp.fromDate(
      new Date(year, month, 0, 23, 59, 59)
    );

    // 이번 달 생성된 항목 조회
    const [eventsSnap, teamsSnap, playersSnap, matchesSnap, playerGamesSnap] =
      await Promise.all([
        db
          .collection("events")
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<=", monthEnd)
          .get(),
        db
          .collection("teams")
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<=", monthEnd)
          .get(),
        db
          .collection("players")
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<=", monthEnd)
          .get(),
        db
          .collection("event_matches")
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<=", monthEnd)
          .get(),
        db
          .collection("player_games")
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<=", monthEnd)
          .get(),
      ]);

    const events = eventsSnap.size;
    const newTeams = teamsSnap.size;
    const newPlayers = playersSnap.size;
    const matches = matchesSnap.size;

    // 이번 달 득점 집계
    let goals = 0;
    playerGamesSnap.forEach((doc) => {
      const data = doc.data();
      goals += data.goals || 0;
    });

    // platform_monthly_stats/{month} 업데이트
    const statsRef = db.doc(`platform_monthly_stats/${monthStr}`);
    const stats: MonthlyStats = {
      month: monthStr,
      events,
      newTeams,
      newPlayers,
      matches,
      goals,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await statsRef.set(stats, { merge: true });

    logger.info("✅ [updateMonthlyStats] 월별 통계 업데이트 완료:", {
      monthStr,
      events,
      newTeams,
      newPlayers,
      matches,
      goals,
    });
  } catch (error: any) {
    logger.error("❌ [updateMonthlyStats] 집계 실패:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 최근 N개월 통계 집계
 */
export async function updateRecentMonthlyStats(
  months: number = 12
): Promise<void> {
  try {
    const now = new Date();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;

      promises.push(updateMonthlyStats(monthStr));
    }

    await Promise.all(promises);

    logger.info("✅ [updateRecentMonthlyStats] 최근 월별 통계 업데이트 완료:", {
      months,
    });
  } catch (error: any) {
    logger.error("❌ [updateRecentMonthlyStats] 집계 실패:", {
      error: error.message,
    });
    throw error;
  }
}
