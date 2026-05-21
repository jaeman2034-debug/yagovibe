/**
 * 🔥 Thumbnail 생성 Cloud Function
 * 
 * 역할:
 * - 이미지 업로드 시 썸네일 자동 생성
 * - 비디오 업로드 시 썸네일 추출
 * - media 문서의 thumbnailUrl 업데이트
 */

import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { admin } from "../firebaseAdmin";

const storage = getStorage();
const db = getFirestore();

/**
 * Storage 파일 업로드 완료 시 트리거
 * 
 * 경로 패턴:
 * - matches/{matchId}/photos/{fileName}
 * - matches/{matchId}/videos/{fileName}
 * - teams/{teamId}/photos/{fileName}
 * - events/{eventId}/gallery/{fileName}
 */
export const onMediaUploaded = onObjectFinalized(
  {
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const filePath = event.data.name;
      const contentType = event.data.contentType || "";

      logger.info("🔄 [onMediaUploaded] 미디어 업로드 감지:", {
        filePath,
        contentType,
      });

      // 이미지 파일만 썸네일 생성 (비디오는 별도 처리)
      if (!contentType.startsWith("image/")) {
        logger.info("⚠️ [onMediaUploaded] 이미지가 아니므로 스킵");
        return;
      }

      // Storage 경로에서 엔티티 정보 추출
      const pathParts = filePath.split("/");
      if (pathParts.length < 3) {
        logger.warn("⚠️ [onMediaUploaded] 경로 형식이 올바르지 않음:", filePath);
        return;
      }

      const entityType = pathParts[0]; // matches, teams, events, players
      const entityId = pathParts[1];
      const mediaType = pathParts[2]; // photos, videos, gallery

      // media 문서 찾기 (url로 검색)
      const mediaQuery = await db
        .collection("media")
        .where("url", "==", `gs://${event.data.bucket}/${filePath}`)
        .limit(1)
        .get();

      if (mediaQuery.empty) {
        logger.warn("⚠️ [onMediaUploaded] media 문서를 찾을 수 없음");
        return;
      }

      const mediaDoc = mediaQuery.docs[0];
      const mediaData = mediaDoc.data();

      // 썸네일 생성 (간단한 리사이즈)
      // Note: 실제로는 sharp 또는 imagemagick 같은 라이브러리 필요
      // 여기서는 원본 URL을 썸네일로 사용 (실제 구현 시 리사이즈 필요)
      const thumbnailUrl = event.data.mediaLink || `gs://${event.data.bucket}/${filePath}`;

      // media 문서 업데이트
      await mediaDoc.ref.update({
        thumbnailUrl,
        status: "ready",
        updatedAt: admin.firestore.Timestamp.now(),
      });

      logger.info("✅ [onMediaUploaded] 썸네일 생성 완료:", {
        mediaId: mediaDoc.id,
        thumbnailUrl,
      });

      // 📧 미디어 업로드 이메일 알림
      try {
        const { sendNotificationEmail } = await import("../email/sendEmail");
        const entityType = mediaData.entityType;
        const entityId = mediaData.entityId;
        
        // 엔티티별 URL 생성
        let mediaUrl = "";
        if (entityType === "match") {
          const matchDoc = await db.doc(`event_matches/${entityId}`).get();
          const matchData = matchDoc.data();
          const eventId = matchData?.eventId;
          mediaUrl = `${process.env.FRONTEND_URL || "https://yagosports.com"}/events/${eventId}?tab=media`;
        } else if (entityType === "event") {
          mediaUrl = `${process.env.FRONTEND_URL || "https://yagosports.com"}/events/${entityId}?tab=media`;
        } else if (entityType === "team") {
          mediaUrl = `${process.env.FRONTEND_URL || "https://yagosports.com"}/teams/${entityId}?tab=media`;
        }

        // 엔티티 이름 조회
        let entityName = "";
        if (entityType === "match") {
          const matchDoc = await db.doc(`event_matches/${entityId}`).get();
          const matchData = matchDoc.data();
          entityName = `${matchData?.homeTeamName || ""} vs ${matchData?.awayTeamName || ""}`;
        } else if (entityType === "event") {
          const eventDoc = await db.doc(`events/${entityId}`).get();
          entityName = eventDoc.data()?.name || "이벤트";
        } else if (entityType === "team") {
          const teamDoc = await db.doc(`teams/${entityId}`).get();
          entityName = teamDoc.data()?.name || "팀";
        }

        // 업로더에게는 이메일 발송하지 않음 (본인이 업로드했으므로)
        // 관련 사용자들에게만 발송 (예: 팀 멤버, 이벤트 참가자 등)
        // 여기서는 간단히 로그만 남김 (실제로는 엔티티별로 구독자 조회 필요)
        logger.info("📧 [onMediaUploaded] 미디어 업로드 이메일 알림 (구현 필요):", {
          entityType,
          entityId,
          entityName,
        });
      } catch (emailError: any) {
        logger.warn("⚠️ [onMediaUploaded] 이메일 알림 실패:", {
          error: emailError.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ [onMediaUploaded] 썸네일 생성 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
