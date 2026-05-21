/**
 * 🔥 Event Match 완료 시 자동 처리
 * 
 * Trigger: event_matches/{matchId} onUpdate
 * 
 * 역할:
 * 1. team_games 생성 (홈/어웨이 각각)
 * 2. rankings 업데이트 (리그 이벤트인 경우)
 * 3. team_event_summary 업데이트
 * 4. event summary 업데이트
 * 
 * 핵심 원칙: 처음 완료될 때만 실행 (중복 방지)
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const logger = functions.logger;

/**
 * 팀 멤버 조회 (이메일 발송용)
 */
async function getTeamMembers(teamId: string): Promise<Array<{ userId: string }>> {
  const db = getFirestore();
  try {
    const membersRef = db.collection(`teams/${teamId}/members`);
    const membersSnap = await membersRef.where("status", "==", "active").get();
    
    const members: Array<{ userId: string }> = [];
    membersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.userId) {
        members.push({ userId: data.userId });
      }
    });
    
    return members;
  } catch (error) {
    logger.warn("⚠️ [getTeamMembers] 팀 멤버 조회 실패:", { teamId, error });
    return [];
  }
}

export const onEventMatchCompleted = functions.firestore
  .document("event_matches/{matchId}")
  .onUpdate(async (change, context) => {
    const db = getFirestore();
    
    const { matchId } = context.params;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    if (!before || !after) {
      logger.warn("⚠️ [onEventMatchCompleted] 문서가 없음:", { matchId });
      return;
    }

    logger.info("🔄 [onEventMatchCompleted] Event Match 변경 감지:", {
      matchId,
      beforeStatus: before.status,
      afterStatus: after.status,
    });

    try {
      // 처음 완료될 때만 실행 (중복 실행 방지)
      if (before.status === "completed") {
        logger.info("ℹ️ [onEventMatchCompleted] 이미 완료 처리됨:", {
          matchId,
          beforeStatus: before.status,
          afterStatus: after.status,
        });
        return;
      }

      if (after.status !== "completed") {
        logger.info("ℹ️ [onEventMatchCompleted] 완료 상태가 아님:", {
          matchId,
          beforeStatus: before.status,
          afterStatus: after.status,
        });
        return;
      }

      // 점수나 상태가 변경되지 않은 경우 스킵 (불필요한 재실행 방지)
      if (
        before.homeScore === after.homeScore &&
        before.awayScore === after.awayScore &&
        before.status === after.status
      ) {
        logger.info("ℹ️ [onEventMatchCompleted] 변경 사항 없음:", {
          matchId,
        });
        return;
      }

      const {
        eventId,
        divisionId,
        seasonId,
        homeTeamId,
        homeTeamName,
        awayTeamId,
        awayTeamName,
        homeScore,
        awayScore,
        scheduledAt,
        venueName,
        venueAddress,
        roundCode,
        roundName,
        stageType,
      } = after;

      // 점수 검증
      if (
        typeof homeScore !== "number" ||
        typeof awayScore !== "number"
      ) {
        logger.warn("⚠️ [onEventMatchCompleted] 점수 정보 없음:", {
          matchId,
          homeScore,
          awayScore,
        });
        return;
      }

      logger.info("✅ [onEventMatchCompleted] Event Match 완료, 처리 시작:", {
        matchId,
        eventId,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
      });

      // Event 정보 조회 (sportType 등)
      const eventDoc = await db.doc(`events/${eventId}`).get();
      if (!eventDoc.exists) {
        logger.warn("⚠️ [onEventMatchCompleted] Event 문서 없음:", { eventId });
        return;
      }

      const eventData = eventDoc.data();
      const sportType = eventData?.sportType || "football";
      const eventType = eventData?.type || "tournament";

      // 승자 결정
      let winnerTeamId: string | null = null;
      let resultType: "home-win" | "away-win" | "draw" | null = null;
      let homeResult: "win" | "draw" | "loss";
      let awayResult: "win" | "draw" | "loss";

      if (homeScore > awayScore) {
        winnerTeamId = homeTeamId;
        resultType = "home-win";
        homeResult = "win";
        awayResult = "loss";
      } else if (awayScore > homeScore) {
        winnerTeamId = awayTeamId;
        resultType = "away-win";
        homeResult = "loss";
        awayResult = "win";
      } else {
        resultType = "draw";
        homeResult = "draw";
        awayResult = "draw";
      }

      // Batch로 team_games 생성 (deterministic ID로 중복 방지)
      const batch = db.batch();

      const now = admin.firestore.Timestamp.now();
      const playedAt = scheduledAt || now;

      // Deterministic ID로 중복 생성 방지
      const teamGameHomeId = `${matchId}_${homeTeamId}`;
      const teamGameAwayId = `${matchId}_${awayTeamId}`;

      // 기존 team_games 확인 (중복 생성 방지)
      const [homeGameDoc, awayGameDoc] = await Promise.all([
        db.doc(`team_games/${teamGameHomeId}`).get(),
        db.doc(`team_games/${teamGameAwayId}`).get(),
      ]);

      if (homeGameDoc.exists || awayGameDoc.exists) {
        logger.warn("⚠️ [onEventMatchCompleted] team_games 이미 존재:", {
          matchId,
          homeGameExists: homeGameDoc.exists,
          awayGameExists: awayGameDoc.exists,
        });
        // 이미 존재하면 업데이트만 수행
        if (homeGameDoc.exists) {
          batch.update(homeGameDoc.ref, {
            homeScore,
            awayScore,
            winnerTeamId,
            resultType,
            status: "completed",
            playedAt,
            updatedAt: now,
          });
        }
        if (awayGameDoc.exists) {
          batch.update(awayGameDoc.ref, {
            homeScore,
            awayScore,
            winnerTeamId,
            resultType,
            status: "completed",
            playedAt,
            updatedAt: now,
          });
        }
      } else {
        // 새로 생성
        // 홈팀 team_game
        const teamGameHomeRef = db.doc(`team_games/${teamGameHomeId}`);
        const teamGameHome = {
        sportType,
        gameType: eventType === "league" ? "league" : "tournament",
        sourceType: "event",
        sourceId: matchId,
        eventId,
        divisionId: divisionId || null,
        seasonId: seasonId || null,
        homeTeamId,
        homeTeamName,
        awayTeamId,
        awayTeamName,
        scheduledAt: scheduledAt || now,
        playedAt,
        location: venueName || null,
        address: venueAddress || null,
        status: "completed",
        homeScore,
        awayScore,
        winnerTeamId,
        resultType,
        roundCode: roundCode || null,
        roundName: roundName || null,
        createdBy: eventData?.createdBy || "system",
        recordedBy: "system",
        recordedAt: now,
        notes: `Event: ${eventData?.name || ""}, Round: ${roundName || ""}`,
        createdAt: now,
        updatedAt: now,
      };

        // 어웨이팀 team_game
        const teamGameAwayRef = db.doc(`team_games/${teamGameAwayId}`);
        const teamGameAway = {
        sportType,
        gameType: eventType === "league" ? "league" : "tournament",
        sourceType: "event",
        sourceId: matchId,
        eventId,
        divisionId: divisionId || null,
        seasonId: seasonId || null,
        homeTeamId,
        homeTeamName,
        awayTeamId,
        awayTeamName,
        scheduledAt: scheduledAt || now,
        playedAt,
        location: venueName || null,
        address: venueAddress || null,
        status: "completed",
        homeScore,
        awayScore,
        winnerTeamId,
        resultType,
        roundCode: roundCode || null,
        roundName: roundName || null,
        createdBy: eventData?.createdBy || "system",
        recordedBy: "system",
        recordedAt: now,
        notes: `Event: ${eventData?.name || ""}, Round: ${roundName || ""}`,
        createdAt: now,
        updatedAt: now,
      };

        batch.set(teamGameHomeRef, teamGameHome);
        batch.set(teamGameAwayRef, teamGameAway);
      }

      await batch.commit();

      logger.info("✅ [onEventMatchCompleted] team_games 생성 완료:", {
        matchId,
        teamGameHomeId,
        teamGameAwayId,
      });

      // 기존 onTeamGameWrite가 자동으로 teams.stats 업데이트
      // (team_games 생성 시 자동 트리거)

      logger.info("✅ [onEventMatchCompleted] team_games 생성 완료:", {
        matchId,
        teamGameHomeId,
        teamGameAwayId,
      });

      // 기존 onTeamGameWrite가 자동으로 teams.stats 업데이트
      // (team_games 생성 시 자동 트리거)

      // 리그 이벤트인 경우 rankings 업데이트
      if (eventType === "league" && divisionId) {
        logger.info("🔄 [onEventMatchCompleted] 리그 이벤트, rankings 업데이트:", {
          eventId,
          divisionId,
        });

        const { updateEventDivisionRankings } = await import("./helpers/rankingHelpers");
        await updateEventDivisionRankings(eventId, divisionId);
      }

      // team_event_summary 업데이트
      const { updateTeamEventSummary } = await import("./helpers/summaryHelpers");
      await updateTeamEventSummary(homeTeamId, eventId, divisionId, {
        result: homeResult,
        goalsFor: homeScore,
        goalsAgainst: awayScore,
      });

      await updateTeamEventSummary(awayTeamId, eventId, divisionId, {
        result: awayResult,
        goalsFor: awayScore,
        goalsAgainst: homeScore,
      });

      // team_season_summary 업데이트 (seasonId가 있는 경우)
      if (seasonId) {
        const { updateTeamSeasonSummary } = await import("./helpers/summaryHelpers");
        await updateTeamSeasonSummary(homeTeamId, seasonId, {
          result: homeResult,
          goalsFor: homeScore,
          goalsAgainst: awayScore,
        });

        await updateTeamSeasonSummary(awayTeamId, seasonId, {
          result: awayResult,
          goalsFor: awayScore,
          goalsAgainst: homeScore,
        });
      }

      // 🔥 최종전 완료 시 Champion / Runner-Up 자동 생성
      if (eventType === "tournament" && stageType === "knockout") {
        const { isFinalMatch, finalizeEventChampion } = await import("./helpers/championHelpers");
        
        const matchData = {
          roundCode,
          roundName,
          stageType,
          nextMatchId: after.nextMatchId || null,
        };

        if (isFinalMatch(matchData)) {
          logger.info("🏆 [onEventMatchCompleted] 최종전 완료 감지, Champion/Runner-Up 생성:", {
            matchId,
            eventId,
            roundCode,
            roundName,
          });

          await finalizeEventChampion(
            eventId,
            matchId,
            homeTeamId,
            homeTeamName,
            awayTeamId,
            awayTeamName,
            homeScore,
            awayScore,
            divisionId
          );
        }
      }

      // 🔔 경기 완료 알림
      try {
        const { notifyMatchCompleted } = await import("../notifications/platformNotificationService");
        await notifyMatchCompleted(
          matchId,
          homeTeamId,
          awayTeamId,
          homeTeamName,
          awayTeamName,
          homeScore,
          awayScore,
          eventId
        );
        logger.info("✅ [onEventMatchCompleted] 경기 완료 알림 전송 완료:", {
          matchId,
          homeTeamId,
          awayTeamId,
        });
      } catch (notifError: any) {
        // 알림 실패해도 경기 기록은 유지
        logger.warn("⚠️ [onEventMatchCompleted] 알림 전송 실패:", {
          matchId,
          error: notifError.message,
        });
      }

      // 📧 경기 결과 이메일 발송
      try {
        const { sendNotificationEmail } = await import("../email/sendEmail");
        const matchUrl = `${process.env.FRONTEND_URL || "https://yagosports.com"}/events/${eventId}?match=${matchId}`;
        
        // 홈팀 멤버들에게 이메일 발송
        const homeTeamMembers = await getTeamMembers(homeTeamId);
        for (const member of homeTeamMembers) {
          await sendNotificationEmail(member.userId, "match_result", {
            homeTeam: homeTeamName,
            awayTeam: awayTeamName,
            homeScore,
            awayScore,
            matchUrl,
            eventName: eventData?.name || "경기",
          });
        }

        // 어웨이팀 멤버들에게 이메일 발송
        const awayTeamMembers = await getTeamMembers(awayTeamId);
        for (const member of awayTeamMembers) {
          await sendNotificationEmail(member.userId, "match_result", {
            homeTeam: homeTeamName,
            awayTeam: awayTeamName,
            homeScore,
            awayScore,
            matchUrl,
            eventName: eventData?.name || "경기",
          });
        }

        logger.info("✅ [onEventMatchCompleted] 경기 결과 이메일 발송 완료:", {
          matchId,
          homeTeamMembers: homeTeamMembers.length,
          awayTeamMembers: awayTeamMembers.length,
        });
      } catch (emailError: any) {
        // 이메일 실패해도 경기 기록은 유지
        logger.warn("⚠️ [onEventMatchCompleted] 이메일 발송 실패:", {
          matchId,
          error: emailError.message,
        });
      }

      logger.info("✅ [onEventMatchCompleted] 처리 완료:", {
        matchId,
        eventId,
        homeTeamId,
        awayTeamId,
      });
    } catch (error: any) {
      logger.error("❌ [onEventMatchCompleted] 처리 실패:", {
        matchId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 경기 기록은 유지
    }
  });

