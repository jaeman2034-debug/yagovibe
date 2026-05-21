/**
 * 🔥 Team Summary 집계 (전체 누적)
 * 
 * 역할:
 * - event_matches를 집계하여 team_summary 생성/업데이트
 * - 경로: team_summary/{teamId}
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export async function aggregateTeamSummary(teamId: string): Promise<void> {
  try {
    // event_matches 조회 (teamId가 홈 또는 원정인 완료된 경기)
    const homeMatchesQuery = db
      .collection("event_matches")
      .where("homeTeamId", "==", teamId)
      .where("status", "==", "completed");

    const awayMatchesQuery = db
      .collection("event_matches")
      .where("awayTeamId", "==", teamId)
      .where("status", "==", "completed");

    const [homeMatchesSnap, awayMatchesSnap] = await Promise.all([
      homeMatchesQuery.get(),
      awayMatchesQuery.get(),
    ]);

    // 집계 계산
    let matches = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let cleanSheets = 0;
    let lastMatchAt: admin.firestore.Timestamp | null = null;

    // 홈 경기 집계
    homeMatchesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.homeScore === null || data.awayScore === null) return;

      matches++;
      goalsFor += data.homeScore || 0;
      goalsAgainst += data.awayScore || 0;

      if (data.homeScore > data.awayScore) {
        wins++;
      } else if (data.homeScore < data.awayScore) {
        losses++;
      } else {
        draws++;
      }

      if (data.awayScore === 0) {
        cleanSheets++;
      }

      // 최신 경기 날짜 추출
      const matchDate = data.scheduledAt || data.updatedAt;
      if (matchDate && (!lastMatchAt || matchDate > lastMatchAt)) {
        lastMatchAt = matchDate;
      }
    });

    // 원정 경기 집계
    awayMatchesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.homeScore === null || data.awayScore === null) return;

      matches++;
      goalsFor += data.awayScore || 0;
      goalsAgainst += data.homeScore || 0;

      if (data.awayScore > data.homeScore) {
        wins++;
      } else if (data.awayScore < data.homeScore) {
        losses++;
      } else {
        draws++;
      }

      if (data.homeScore === 0) {
        cleanSheets++;
      }

      // 최신 경기 날짜 추출
      const matchDate = data.scheduledAt || data.updatedAt;
      if (matchDate && (!lastMatchAt || matchDate > lastMatchAt)) {
        lastMatchAt = matchDate;
      }
    });

    // Awards 조회 (수상 카운트)
    let championships = 0;
    let runnerUps = 0;
    let semifinals = 0;

    try {
      const awardsQuery = db.collection("team_awards").where("teamId", "==", teamId);

      const awardsSnap = await awardsQuery.get();
      awardsSnap.forEach((doc) => {
        const award = doc.data();
        const awardType = award.awardType;

        if (awardType === "champion") {
          championships++;
        } else if (awardType === "runner_up") {
          runnerUps++;
        } else if (awardType === "semifinalist") {
          semifinals++;
        }
      });
    } catch (error) {
      // Awards 조회 실패해도 계속 진행
    }

    // Summary 문서 생성/업데이트
    const summaryRef = db.doc(`team_summary/${teamId}`);

    const now = admin.firestore.Timestamp.now();

    await summaryRef.set(
      {
        id: teamId,
        teamId,
        organizationId: null, // 필요시 추가
        matches,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        cleanSheets,
        championships,
        runnerUps,
        semifinals,
        lastMatchAt: lastMatchAt || null,
        updatedAt: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("✅ [aggregateTeamSummary] 완료:", {
      teamId,
      matches,
      wins,
      goalsFor,
      championships,
    });
  } catch (error: any) {
    logger.error("❌ [aggregateTeamSummary] 실패:", {
      teamId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
