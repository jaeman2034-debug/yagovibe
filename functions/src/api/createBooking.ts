/**
 * Create Booking API
 * 대관 생성 API 엔드포인트 (서버 가드 포함)
 * 
 * Policy Resolver를 통한 권한 검증 후 booking 생성
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { resolveBookingPolicySimple } from "../policy/policyResolver";
import { BookingPermission } from "../types/policy";
import type { PolicyResult } from "../policy/policyResolver";

const db = admin.firestore();

/**
 * Create Booking Input
 */
export interface CreateBookingInput {
  associationId: string;
  teamId: string;
  facilityId: string;
  startAt: string; // ISO 8601 format: "2026-01-01T10:00:00+09:00"
  endAt: string; // ISO 8601 format: "2026-01-01T12:00:00+09:00"
  purpose?: string; // 선택적 목적
}

/**
 * Create Booking Output
 */
export interface CreateBookingOutput {
  bookingId: string;
  status: "CONFIRMED" | "WAITLIST" | "PENDING";
  actionType: string;
  message: string;
}

/**
 * POST /api/booking/create
 * 대관 생성 API (서버 가드 적용)
 * 
 * @example
 * ```typescript
 * const createBooking = httpsCallable(functions, "createBooking");
 * const result = await createBooking({
 *   associationId: "assoc-nowon-football",
 *   teamId: "team-nowon-fc",
 *   facilityId: "facility-army-academy",
 *   startAt: "2026-01-01T10:00:00+09:00",
 *   endAt: "2026-01-01T12:00:00+09:00",
 *   purpose: "연습경기"
 * });
 * ```
 */
export const createBooking = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { associationId, teamId, facilityId, startAt, endAt, purpose } = req.data ?? {};
    const uid = req.auth?.uid;

    // 1. 인증 체크
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 2. 파라미터 검증
    if (!teamId || !facilityId || !startAt || !endAt) {
      throw new HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다. (teamId, facilityId, startAt, endAt 모두 필요)"
      );
    }

    // 3. 시간 형식 검증
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpsError(
        "invalid-argument",
        "startAt과 endAt은 유효한 ISO 8601 형식이어야 합니다."
      );
    }

    if (startDate >= endDate) {
      throw new HttpsError(
        "invalid-argument",
        "endAt은 startAt보다 늦어야 합니다."
      );
    }

    // 4. Policy Resolver 호출 (서버 가드 - 날짜 기반 슬롯 정책 포함)
    let policyResult: PolicyResult;
    try {
      policyResult = await resolveBookingPolicySimple(teamId, facilityId, startDate);
    } catch (error) {
      logger.error(`Error resolving booking policy: ${error}`);
      throw new HttpsError(
        "internal",
        "대관 권한 확인 중 오류가 발생했습니다."
      );
    }

    logger.info(`Policy resolved for booking: teamId=${teamId}, facilityId=${facilityId}, actionType=${policyResult.actionType}`);

    // 5. actionType 분기 처리
    let bookingStatus: "CONFIRMED" | "WAITLIST" | "PENDING";
    let bookingId: string;

    if (policyResult.actionType === BookingPermission.APPLY) {
      // ✅ 대관 신청 가능 → 즉시 확정
      bookingStatus = "CONFIRMED";
      bookingId = await createBookingDocument({
        teamId,
        facilityId,
        startAt: startDate,
        endAt: endDate,
        purpose,
        status: bookingStatus,
        actionType: policyResult.actionType,
        decision: {
          actionType: policyResult.actionType,
          reasonCode: policyResult.reasonCode,
          message: policyResult.message,
          priority: policyResult.priority,
        },
        createdByUid: uid,
      });

      logger.info(`Booking created (CONFIRMED): ${bookingId}`);

    } else if (policyResult.actionType === BookingPermission.WAITLIST) {
      // ⏳ 대기 신청 → WAITLIST 상태로 생성
      bookingStatus = "WAITLIST";
      bookingId = await createBookingDocument({
        teamId,
        facilityId,
        startAt: startDate,
        endAt: endDate,
        purpose,
        status: bookingStatus,
        actionType: policyResult.actionType,
        decision: {
          actionType: policyResult.actionType,
          reasonCode: policyResult.reasonCode,
          message: policyResult.message,
          priority: policyResult.priority,
        },
        createdByUid: uid,
      });

      logger.info(`Booking created (WAITLIST): ${bookingId}`);

    } else if (policyResult.actionType === BookingPermission.REQUEST) {
      // ⏳ 협회 승인 요청 → PENDING 상태로 생성
      bookingStatus = "PENDING";
      bookingId = await createBookingDocument({
        teamId,
        facilityId,
        startAt: startDate,
        endAt: endDate,
        purpose,
        status: bookingStatus,
        actionType: policyResult.actionType,
        decision: {
          actionType: policyResult.actionType,
          reasonCode: policyResult.reasonCode,
          message: policyResult.message,
          priority: policyResult.priority,
        },
        createdByUid: uid,
      });

      logger.info(`Booking created (PENDING): ${bookingId}`);

    } else {
      // ❌ VIEW_ONLY 또는 기타 → 권한 없음 에러
      throw new HttpsError(
        "permission-denied",
        `대관 신청 권한이 없습니다: ${policyResult.message}`
      );
    }

    return {
      bookingId,
      status: bookingStatus,
      actionType: policyResult.actionType,
      message: policyResult.message,
    } as CreateBookingOutput;
  }
);

/**
 * Booking 문서 생성 (내부 헬퍼)
 */
async function createBookingDocument(params: {
  teamId: string;
  facilityId: string;
  startAt: Date;
  endAt: Date;
  purpose?: string;
  status: "CONFIRMED" | "WAITLIST" | "PENDING";
  actionType: BookingPermission;
  decision: {
    actionType: BookingPermission;
    reasonCode: string;
    message: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  };
  createdByUid: string;
}): Promise<string> {
  const bookingRef = db.collection("bookings").doc();

  await bookingRef.set({
    id: bookingRef.id,
    teamId: params.teamId,
    facilityId: params.facilityId,
    date: params.startAt.toISOString().split("T")[0], // YYYY-MM-DD
    time: params.startAt.toTimeString().slice(0, 5), // HH:mm
    dateTime: admin.firestore.Timestamp.fromDate(params.startAt),
    endDateTime: admin.firestore.Timestamp.fromDate(params.endAt),
    status: params.status,
    actionType: params.actionType,
    purpose: params.purpose || null,
    
    // Audit fields
    createdByUid: params.createdByUid,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    
    // Policy decision 저장 (협회 리포트용)
    decision: {
      actionType: params.decision.actionType,
      reasonCode: params.decision.reasonCode,
      message: params.decision.message,
      priority: params.decision.priority,
    },
  });

  return bookingRef.id;
}

