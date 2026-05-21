/**
 * 🔥 Team Event Summary 집계
 * 
 * 역할:
 * - event_matches를 집계하여 team_event_summary 생성/업데이트
 * - 경로: team_event_summaries/{teamId}_{eventId}
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export async function aggregateTeamEventSummary(
  teamId: string,
  eventId: string,
  divisionId: string | null
): Promise<void> {
  try {
    // event_matches 조회 (teamId가 홈 또는 원정인 경기)
    const homeMatchesQuery = db
      .collection("event_matches")
      .where("eventId", "==", eventId)
      .where("homeTeamId", "==", teamId)
      .where("status", "==", "completed");

    const awayMatchesQuery = db
      .collection("event_matches")
      .where("eventId", "==", eventId)
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
    });

    if (matches === 0) {
      logger.info("ℹ️ [aggregateTeamEventSummary] 완료된 경기 없음:", {
        teamId,
        eventId,
      });
      return;
    }

    // 팀 정보 조회
    let teamName: string | null = null;
    try {
      const teamDoc = await db.doc(`teams/${teamId}`).get();
      if (teamDoc.exists) {
        teamName = teamDoc.data()?.name || null;
      }
    } catch (error) {
      // 팀 조회 실패해도 계속 진행
    }

    // Summary 문서 생성/업데이트
    const summaryId = `${teamId}_${eventId}${divisionId ? `_${divisionId}` : ""}`;
    const summaryRef = db.doc(`team_event_summaries/${summaryId}`);

    const now = admin.firestore.Timestamp.now();

    await summaryRef.set(
      {
        id: summaryId,
        teamId,
        teamName: teamName || null,
        eventId,
        divisionId: divisionId || null,
        matches,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        cleanSheets,
        updatedAt: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("✅ [aggregateTeamEventSummary] 완료:", {
      teamId,
      eventId,
      summaryId,
      matches,
      wins,
      goalsFor,
    });
  } catch (error: any) {
    logger.error("❌ [aggregateTeamEventSummary] 실패:", {
      teamId,
      eventId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
