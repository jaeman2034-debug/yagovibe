/**
 * 🔥 Platform Stats 집계 함수
 * 
 * 역할:
 * - 플랫폼 전체 통계 집계
 * - platform_stats/global 문서 업데이트
 * - 월별 변화 계산
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export interface PlatformStats {
  totalEvents: number;
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  totalGoals: number;
  
  // 월별 변화
  eventsThisMonth: number;
  teamsThisMonth: number;
  playersThisMonth: number;
  matchesThisMonth: number;
  goalsThisMonth: number;
  
  updatedAt: any;
}

/**
 * 플랫폼 통계 집계 및 업데이트
 */
export async function updatePlatformStats(): Promise<void> {
  try {
    logger.info("🔄 [updatePlatformStats] 플랫폼 통계 집계 시작");

    const now = admin.firestore.Timestamp.now();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthStart = admin.firestore.Timestamp.fromDate(
      new Date(currentYear, currentMonth, 1)
    );

    // 병렬로 모든 통계 조회
    const [
      eventsSnapshot,
      teamsSnapshot,
      playersSnapshot,
      matchesSnapshot,
      playerGamesSnapshot,
    ] = await Promise.all([
      db.collection("events").get(),
      db.collection("teams").get(),
      db.collection("players").get(),
      db.collection("event_matches").get(),
      db.collection("player_games").get(),
    ]);

    // 전체 통계
    const totalEvents = eventsSnapshot.size;
    const totalTeams = teamsSnapshot.size;
    const totalPlayers = playersSnapshot.size;
    const totalMatches = matchesSnapshot.size;

    // 총 득점 계산 (player_games에서)
    let totalGoals = 0;
    playerGamesSnapshot.forEach((doc) => {
      const data = doc.data();
      totalGoals += data.goals || 0;
    });

    // 이번 달 생성된 항목 계산
    let eventsThisMonth = 0;
    eventsSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (createdAt && createdAt.toMillis() >= monthStart.toMillis()) {
        eventsThisMonth++;
      }
    });

    let teamsThisMonth = 0;
    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (createdAt && createdAt.toMillis() >= monthStart.toMillis()) {
        teamsThisMonth++;
      }
    });

    let playersThisMonth = 0;
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (createdAt && createdAt.toMillis() >= monthStart.toMillis()) {
        playersThisMonth++;
      }
    });

    let matchesThisMonth = 0;
    matchesSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (createdAt && createdAt.toMillis() >= monthStart.toMillis()) {
        matchesThisMonth++;
      }
    });

    // 이번 달 득점 계산
    let goalsThisMonth = 0;
    playerGamesSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (createdAt && createdAt.toMillis() >= monthStart.toMillis()) {
        goalsThisMonth += data.goals || 0;
      }
    });

    // platform_stats/global 업데이트
    const statsRef = db.doc("platform_stats/global");
    const stats: PlatformStats = {
      totalEvents,
      totalTeams,
      totalPlayers,
      totalMatches,
      totalGoals,
      eventsThisMonth,
      teamsThisMonth,
      playersThisMonth,
      matchesThisMonth,
      goalsThisMonth,
      updatedAt: now,
    };

    await statsRef.set(stats, { merge: true });

    logger.info("✅ [updatePlatformStats] 플랫폼 통계 업데이트 완료:", {
      totalEvents,
      totalTeams,
      totalPlayers,
      totalMatches,
      totalGoals,
    });
  } catch (error: any) {
    logger.error("❌ [updatePlatformStats] 집계 실패:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
