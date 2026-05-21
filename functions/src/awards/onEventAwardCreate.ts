/**
 * 🔥 Event Award 생성 시 자동 처리
 * 
 * Trigger: event_awards/{awardId} onCreate
 * 
 * 역할:
 * 1. player_awards 또는 team_awards 생성
 * 2. player_summary / team_summary 수상 카운트 업데이트
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

/**
 * 팀 멤버 조회 (이메일 발송용)
 */
async function getTeamMembers(teamId: string): Promise<Array<{ userId: string }>> {
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

export const onEventAwardCreate = onDocumentCreated(
  {
    document: "event_awards/{awardId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { awardId } = event.params;
    const awardData = event.data?.data();

    if (!awardData) {
      logger.warn("⚠️ [onEventAwardCreate] award 데이터 없음:", { awardId });
      return;
    }

    const { eventId, divisionId, awardType, teamId, playerId, playerName } = awardData;

    logger.info("🏆 [onEventAwardCreate] Award 생성 감지:", {
      awardId,
      eventId,
      awardType,
      teamId,
      playerId,
    });

    try {
      // Event 정보 조회 (이름 등)
      let eventName: string | null = null;
      try {
        const eventDoc = await db.doc(`events/${eventId}`).get();
        if (eventDoc.exists) {
          eventName = eventDoc.data()?.name || null;
        }
      } catch (error) {
        // Event 조회 실패해도 계속 진행
      }

      const now = admin.firestore.Timestamp.now();

      // 선수 수상인 경우
      if (playerId && awardType !== "champion" && awardType !== "runner_up") {
        const playerAwardRef = db.doc(`player_awards/${awardId}`);

        const title = eventName
          ? `${eventName} ${getAwardTypeLabel(awardType)}`
          : `${getAwardTypeLabel(awardType)}`;

        await playerAwardRef.set(
          {
            id: awardId,
            playerId,
            teamId: teamId || null,
            eventId,
            organizationId: null, // 필요시 추가
            awardType: mapAwardType(awardType),
            title,
            awardedAt: now,
            createdAt: now,
          },
          { merge: true }
        );

        // player_summary 수상 카운트 업데이트
        await updatePlayerAwardCount(playerId, mapAwardType(awardType));

        logger.info("✅ [onEventAwardCreate] player_award 생성 완료:", {
          awardId,
          playerId,
        });
      }

      // 팀 수상인 경우 (champion, runner_up)
      if (teamId && (awardType === "champion" || awardType === "runner_up")) {
        const teamAwardRef = db.doc(`team_awards/${awardId}`);

        const title = eventName
          ? `${eventName} ${getAwardTypeLabel(awardType)}`
          : `${getAwardTypeLabel(awardType)}`;

        await teamAwardRef.set(
          {
            id: awardId,
            teamId,
            eventId,
            organizationId: null, // 필요시 추가
            awardType: awardType === "champion" ? "champion" : "runner_up",
            title,
            awardedAt: now,
            createdAt: now,
          },
          { merge: true }
        );

        // team_summary 수상 카운트 업데이트
        await updateTeamAwardCount(teamId, awardType);

        logger.info("✅ [onEventAwardCreate] team_award 생성 완료:", {
          awardId,
          teamId,
        });

        // 🔔 팀 수상 알림
        try {
          const { notifyAwardAnnounced } = await import("../notifications/platformNotificationService");
          await notifyAwardAnnounced(
            teamId,
            "team",
            eventId,
            awardType,
            title,
            eventName || undefined
          );
        } catch (notifError: any) {
          logger.warn("⚠️ [onEventAwardCreate] 팀 수상 알림 실패:", {
            awardId,
            teamId,
            error: notifError.message,
          });
        }

        // 📧 팀 수상 이메일 발송
        try {
          const { sendNotificationEmail } = await import("../email/sendEmail");
          const awardUrl = `${process.env.FRONTEND_URL || "https://yagosports.com"}/events/${eventId}?tab=results`;
          
          // 팀 멤버들에게 이메일 발송
          const teamMembers = await getTeamMembers(teamId);
          for (const member of teamMembers) {
            await sendNotificationEmail(member.userId, "award_announced", {
              awardType,
              recipientName: teamId, // 팀 이름으로 변경 가능
              eventName: eventName || "이벤트",
              awardUrl,
            });
          }

          logger.info("✅ [onEventAwardCreate] 팀 수상 이메일 발송 완료:", {
            awardId,
            teamId,
            members: teamMembers.length,
          });
        } catch (emailError: any) {
          logger.warn("⚠️ [onEventAwardCreate] 팀 수상 이메일 발송 실패:", {
            awardId,
            teamId,
            error: emailError.message,
          });
        }
      }

      // 🔔 선수 수상 알림
      if (playerId && awardType !== "champion" && awardType !== "runner_up") {
        const playerAwardNotifyTitle = eventName
          ? `${eventName} ${getAwardTypeLabel(awardType)}`
          : `${getAwardTypeLabel(awardType)}`;
        try {
          const { notifyAwardAnnounced } = await import("../notifications/platformNotificationService");
          await notifyAwardAnnounced(
            playerId,
            "player",
            eventId,
            awardType,
            playerAwardNotifyTitle,
            eventName || undefined
          );
        } catch (notifError: any) {
          logger.warn("⚠️ [onEventAwardCreate] 선수 수상 알림 실패:", {
            awardId,
            playerId,
            error: notifError.message,
          });
        }

        // 📧 선수 수상 이메일 발송
        try {
          const { sendNotificationEmail } = await import("../email/sendEmail");
          const awardUrl = `${process.env.FRONTEND_URL || "https://yagosports.com"}/events/${eventId}?tab=results`;
          
          await sendNotificationEmail(playerId, "award_announced", {
            awardType,
            recipientName: playerName || "선수",
            eventName: eventName || "이벤트",
            awardUrl,
          });

          logger.info("✅ [onEventAwardCreate] 선수 수상 이메일 발송 완료:", {
            awardId,
            playerId,
          });
        } catch (emailError: any) {
          logger.warn("⚠️ [onEventAwardCreate] 선수 수상 이메일 발송 실패:", {
            awardId,
            playerId,
            error: emailError.message,
          });
        }
      }
    } catch (error: any) {
      logger.error("❌ [onEventAwardCreate] 처리 실패:", {
        awardId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 원본 데이터는 유지
    }
  }
);

/**
 * Award Type 라벨 변환
 */
function getAwardTypeLabel(awardType: string): string {
  const labels: Record<string, string> = {
    champion: "우승",
    runner_up: "준우승",
    top_scorer: "득점왕",
    top_assist: "도움왕",
    mvp: "MVP",
    best11: "베스트11",
    fair_play: "페어플레이상",
  };
  return labels[awardType] || awardType;
}

/**
 * Award Type 매핑 (event_awards → player_awards)
 */
function mapAwardType(awardType: string): "top_scorer" | "top_assist" | "mvp" | "best11" | "fair_play" {
  if (awardType === "top_scorer") return "top_scorer";
  if (awardType === "top_assist") return "top_assist";
  if (awardType === "mvp") return "mvp";
  if (awardType === "best11") return "best11";
  if (awardType === "fair_play") return "fair_play";
  return "mvp"; // 기본값
}

/**
 * Player Summary 수상 카운트 업데이트
 */
async function updatePlayerAwardCount(
  playerId: string,
  awardType: "top_scorer" | "top_assist" | "mvp" | "best11" | "fair_play"
): Promise<void> {
  try {
    const summaryRef = db.doc(`player_summary/${playerId}`);
    const summarySnap = await summaryRef.get();

    if (!summarySnap.exists) {
      // Summary가 없으면 생성하지 않음 (aggregatePlayerSummary에서 생성)
      return;
    }

    const updateField =
      awardType === "mvp"
        ? "mvpAwards"
        : awardType === "top_scorer"
        ? "topScorerAwards"
        : awardType === "best11"
        ? "best11Awards"
        : null;

    if (updateField) {
      await summaryRef.update({
        [updateField]: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  } catch (error: any) {
    logger.error("❌ [updatePlayerAwardCount] 실패:", {
      playerId,
      awardType,
      error: error.message,
    });
  }
}

/**
 * Team Summary 수상 카운트 업데이트
 */
async function updateTeamAwardCount(
  teamId: string,
  awardType: "champion" | "runner_up"
): Promise<void> {
  try {
    const summaryRef = db.doc(`team_summary/${teamId}`);
    const summarySnap = await summaryRef.get();

    if (!summarySnap.exists) {
      // Summary가 없으면 생성하지 않음 (aggregateTeamSummary에서 생성)
      return;
    }

    const updateField = awardType === "champion" ? "championships" : "runnerUps";

    await summaryRef.update({
      [updateField]: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  } catch (error: any) {
    logger.error("❌ [updateTeamAwardCount] 실패:", {
      teamId,
      awardType,
      error: error.message,
    });
  }
}
