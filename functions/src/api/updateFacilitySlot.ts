/**
 * Update Facility Slot
 * Phase 4-1: 대관 슬롯 상태 변경
 * 
 * available ↔ blocked 토글
 * 상태 변경 시 자동 알림 발송
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

type FacilitySlotStatus = "available" | "blocked" | "event";

interface UpdateFacilitySlotRequest {
  facilityId: string;
  slotId: string;
  status: FacilitySlotStatus;
}

/**
 * 슬롯 상태 변경 (available ↔ blocked)
 * 
 * @example
 * ```typescript
 * const updateFacilitySlot = httpsCallable(functions, "updateFacilitySlot");
 * const result = await updateFacilitySlot({
 *   facilityId: "facility-1",
 *   slotId: "slot-123",
 *   status: "blocked"
 * });
 * ```
 */
export const updateFacilitySlot = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { auth, data } = request;
    const uid = auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { facilityId, slotId, status } = data as UpdateFacilitySlotRequest;

    if (!facilityId || !slotId || !status) {
      throw new HttpsError("invalid-argument", "필수 파라미터가 누락되었습니다.");
    }

    if (status !== "available" && status !== "blocked") {
      throw new HttpsError("invalid-argument", "status는 'available' 또는 'blocked'만 가능합니다.");
    }

    try {
      const db = getFirestore();
      const slotRef = db.doc(`facilities/${facilityId}/slots/${slotId}`);
      const slotDoc = await slotRef.get();

      if (!slotDoc.exists) {
        throw new HttpsError("not-found", "슬롯을 찾을 수 없습니다.");
      }

      const slotData = slotDoc.data()!;
      const currentStatus = slotData.status as FacilitySlotStatus;

      // event 슬롯은 변경 불가
      if (currentStatus === "event") {
        throw new HttpsError("permission-denied", "대회/행사 슬롯은 변경할 수 없습니다.");
      }

      // 상태 업데이트
      await slotRef.update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      });

      logger.info(`✅ [updateFacilitySlot] 슬롯 상태 변경 완료`, {
        facilityId,
        slotId,
        from: currentStatus,
        to: status,
        uid,
      });

      // TODO: 자동 알림 발송 (카카오 알림톡 API 또는 Stub)
      // await sendSlotStatusNotification(facilityId, slotId, status, slotData);

      return {
        success: true,
        message: "슬롯 상태가 변경되었습니다.",
      };
    } catch (error: any) {
      logger.error("❌ [updateFacilitySlot] 슬롯 상태 변경 실패", {
        facilityId,
        slotId,
        uid,
        error: error.message,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "슬롯 상태 변경 중 오류가 발생했습니다.");
    }
  }
);

/**
 * 슬롯 상태 변경 알림 발송 (Stub)
 * 
 * TODO: 실제 카카오 알림톡 API 연결
 */
async function sendSlotStatusNotification(
  facilityId: string,
  slotId: string,
  status: FacilitySlotStatus,
  slotData: any
): Promise<void> {
  try {
    // TODO: 클럽 대표자 리스트 조회
    // const clubLeaders = await getClubLeaders(associationId);

    const statusLabel = status === "available" ? "사용 가능" : "협회 사용";
    const date = slotData.date;
    const timeRange = slotData.timeRange;

    // 메시지 예시 (지시문 고정 문구)
    const message = `[노원구 축구협회]
마들 스타디움 ${date} ${timeRange}
→ ${statusLabel}으로 변경되었습니다.
자세한 내용은 공식 페이지에서 확인해주세요.`;

    logger.info("📱 [sendSlotStatusNotification] 알림 발송 (Stub)", {
      facilityId,
      slotId,
      status,
      message,
    });

    // TODO: 카카오 알림톡 API 호출
    // await sendKakaoAlimtalk(clubLeaders, message);
  } catch (error: any) {
    logger.error("❌ [sendSlotStatusNotification] 알림 발송 실패", {
      facilityId,
      slotId,
      error: error.message,
    });
    // 알림 실패해도 슬롯 상태 변경은 성공
  }
}

