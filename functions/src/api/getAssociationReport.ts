/**
 * Get Association Report API
 * 협회 대관 운영 리포트 집계
 * 
 * bookings.decision 기반 리포트 집계
 * 협회 설득/운영을 위한 핵심 지표
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { TeamStatus } from "../types/policy";
import { BookingPermission } from "../types/policy";

const db = admin.firestore();

/**
 * 리포트 입력 파라미터
 */
export interface GetAssociationReportInput {
  associationId: string;
  from: string; // ISO date string: "2026-01-01"
  to: string; // ISO date string: "2026-01-31"
}

/**
 * 리포트 출력 스키마
 */
export interface AssociationReportOutput {
  /** 협회 ID */
  associationId: string;
  /** 리포트 기간 */
  period: {
    from: string;
    to: string;
  };
  /** 전체 대관 요청 수 */
  totalBookings: number;
  /** 팀 유형별 요청 수 */
  byTeamType: {
    MEMBER: number;
    NON_MEMBER: number;
    ACADEMY: number;
  };
  /** 결정(actionType)별 집계 */
  byDecision: {
    APPLY: number;
    REQUEST: number;
    WAITLIST: number;
    VIEW_ONLY: number;
  };
  /** 우선순위별 사용률 */
  priorityUsage: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  /** 상태별 집계 */
  byStatus: {
    CONFIRMED: number;
    WAITLIST: number;
    PENDING: number;
  };
  /** 시설별 집중도 (상위 5개) */
  topFacilities: Array<{
    facilityId: string;
    facilityName: string;
    bookingCount: number;
    memberBookingRate: number;
  }>;
  /** 전환 지표 */
  conversionMetrics: {
    /** 비회원 DENY 횟수 (VIEW_ONLY) */
    nonMemberDenies: number;
    /** 회원 전환 문의 발생 수 */
    conversionRequests: number;
    /** 전환 후 booking 성공률 (%) */
    conversionSuccessRate: number;
  };
  /** 생성 시점 */
  generatedAt: string;
}

/**
 * GET /api/association/report
 * 협회 대관 운영 리포트 조회
 * 
 * @example
 * ```typescript
 * const getAssociationReport = httpsCallable(functions, "getAssociationReport");
 * const result = await getAssociationReport({
 *   associationId: "assoc-nowon-football",
 *   from: "2026-01-01",
 *   to: "2026-01-31"
 * });
 * ```
 */
export const getAssociationReport = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60, // 집계 작업 시간 확보
  },
  async (req) => {
    const { associationId, from, to } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!associationId || !from || !to) {
      throw new HttpsError(
        "invalid-argument",
        "associationId, from, to가 모두 필요합니다."
      );
    }

    try {
      // 날짜 변환
      const fromDate = Timestamp.fromDate(new Date(from));
      const toDate = Timestamp.fromDate(new Date(to + "T23:59:59"));

      // 리포트 집계
      const report = await aggregateAssociationReport(
        associationId,
        fromDate,
        toDate
      );

      logger.info(`Association report generated: ${associationId}`, {
        period: { from, to },
        totalBookings: report.totalBookings,
      });

      return report;
    } catch (error) {
      logger.error(`Error generating association report: ${error}`);
      throw new HttpsError(
        "internal",
        "리포트 생성 중 오류가 발생했습니다."
      );
    }
  }
);

/**
 * 협회 리포트 집계 함수
 * (export하여 다른 모듈에서도 재사용 가능)
 */
export async function aggregateAssociationReport(
  associationId: string,
  fromDate: Timestamp,
  toDate: Timestamp
): Promise<AssociationReportOutput> {
  // 1. 협회 소속 팀 조회
  const teamsSnapshot = await db
    .collection("teams")
    .where("associationId", "==", associationId)
    .get();

  const teams = teamsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const teamIds = teams.map((t) => t.id);
  const teamMap = new Map(teams.map((t) => [t.id, t.status]));

  if (teamIds.length === 0) {
    return createEmptyReport(associationId, fromDate, toDate);
  }

  // 2. 기간 내 bookings 조회 (배치 처리 - Firestore 'in' 제한 10개)
  let allBookings: admin.firestore.QueryDocumentSnapshot[] = [];

  for (let i = 0; i < teamIds.length; i += 10) {
    const batch = teamIds.slice(i, i + 10);
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("teamId", "in", batch)
      .where("createdAt", ">=", fromDate)
      .where("createdAt", "<=", toDate)
      .get();

    allBookings = [...allBookings, ...bookingsSnapshot.docs];
  }

  const bookings = allBookings.map((doc) => doc.data());

  // 3. 집계 초기화
  const byTeamType = {
    MEMBER: 0,
    NON_MEMBER: 0,
    ACADEMY: 0,
  };

  const byDecision = {
    APPLY: 0,
    REQUEST: 0,
    WAITLIST: 0,
    VIEW_ONLY: 0,
  };

  const priorityUsage = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  const byStatus = {
    CONFIRMED: 0,
    WAITLIST: 0,
    PENDING: 0,
  };

  const facilityCounts: Record<
    string,
    { name: string; total: number; memberCount: number }
  > = {};

  let nonMemberDenies = 0;
  const convertedTeamIds = new Set<string>();

  // 4. bookings 집계
  for (const booking of bookings) {
    const teamStatus = teamMap.get(booking.teamId) || TeamStatus.NON_MEMBER;

    // 팀 유형별 집계
    if (teamStatus === TeamStatus.MEMBER) {
      byTeamType.MEMBER++;
    } else if (teamStatus === TeamStatus.ACADEMY) {
      byTeamType.ACADEMY++;
    } else {
      byTeamType.NON_MEMBER++;
    }

    // 결정(actionType)별 집계
    const actionType = booking.decision?.actionType || booking.actionType;
    if (actionType === BookingPermission.APPLY) {
      byDecision.APPLY++;
    } else if (actionType === BookingPermission.REQUEST) {
      byDecision.REQUEST++;
    } else if (actionType === BookingPermission.WAITLIST) {
      byDecision.WAITLIST++;
    } else if (actionType === BookingPermission.VIEW_ONLY) {
      byDecision.VIEW_ONLY++;
      // 비회원 DENY 카운트
      if (teamStatus === TeamStatus.NON_MEMBER) {
        nonMemberDenies++;
      }
    }

    // 우선순위별 집계
    const priority = booking.decision?.priority || "LOW";
    if (priority === "HIGH") {
      priorityUsage.HIGH++;
    } else if (priority === "MEDIUM") {
      priorityUsage.MEDIUM++;
    } else {
      priorityUsage.LOW++;
    }

    // 상태별 집계
    const status = booking.status || "PENDING";
    if (status === "CONFIRMED") {
      byStatus.CONFIRMED++;
    } else if (status === "WAITLIST") {
      byStatus.WAITLIST++;
    } else if (status === "PENDING") {
      byStatus.PENDING++;
    }

    // 시설별 집계
    const facilityId = booking.facilityId;
    if (facilityId) {
      if (!facilityCounts[facilityId]) {
        const facilityDoc = await db.doc(`facilities/${facilityId}`).get();
        facilityCounts[facilityId] = {
          name: facilityDoc.data()?.name || facilityId,
          total: 0,
          memberCount: 0,
        };
      }
      facilityCounts[facilityId].total++;
      if (teamStatus === TeamStatus.MEMBER) {
        facilityCounts[facilityId].memberCount++;
      }
    }
  }

  // 5. 시설별 집중도 계산 (상위 5개)
  const topFacilities = await Promise.all(
    Object.entries(facilityCounts)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(async ([facilityId, stats]) => ({
        facilityId,
        facilityName: stats.name,
        bookingCount: stats.total,
        memberBookingRate:
          stats.total > 0
            ? Math.round((stats.memberCount / stats.total) * 100 * 10) / 10
            : 0,
      }))
  );

  // 6. 전환 지표 계산
  const conversionMetrics = await calculateConversionMetrics(
    associationId,
    fromDate,
    toDate,
    teamIds,
    convertedTeamIds
  );

  // 7. 리포트 결과 구성
  return {
    associationId,
    period: {
      from: fromDate.toDate().toISOString().split("T")[0],
      to: toDate.toDate().toISOString().split("T")[0],
    },
    totalBookings: bookings.length,
    byTeamType,
    byDecision,
    priorityUsage,
    byStatus,
    topFacilities,
    conversionMetrics: {
      nonMemberDenies,
      conversionRequests: conversionMetrics.conversionRequests,
      conversionSuccessRate: conversionMetrics.conversionSuccessRate,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 전환 지표 계산
 */
async function calculateConversionMetrics(
  associationId: string,
  fromDate: Timestamp,
  toDate: Timestamp,
  teamIds: string[],
  convertedTeamIds: Set<string>
): Promise<{
  conversionRequests: number;
  conversionSuccessRate: number;
}> {
  // membership_conversions 조회
  const conversionsSnapshot = await db
    .collection("membership_conversions")
    .where("requestedAt", ">=", fromDate)
    .where("requestedAt", "<=", toDate)
    .get();

  const conversions = conversionsSnapshot.docs
    .map((doc) => doc.data())
    .filter((c) => teamIds.includes(c.teamId));

  const conversionRequests = conversions.length;

  // 전환 승인된 팀들
  const approvedConversions = conversions.filter((c) => c.approvedAt);
  const approvedTeamIds = approvedConversions.map((c) => c.teamId);

  // 전환 후 booking 성공률 계산
  let conversionSuccessBookings = 0;
  if (approvedTeamIds.length > 0) {
    // 전환 승인 후 bookings 조회
    for (let i = 0; i < approvedTeamIds.length; i += 10) {
      const batch = approvedTeamIds.slice(i, i + 10);
      const successBookings = await db
        .collection("bookings")
        .where("teamId", "in", batch)
        .where("status", "==", "CONFIRMED")
        .get();

      conversionSuccessBookings += successBookings.size;
    }
  }

  const conversionSuccessRate =
    approvedTeamIds.length > 0
      ? Math.round((conversionSuccessBookings / approvedTeamIds.length) * 100 * 10) / 10
      : 0;

  return {
    conversionRequests,
    conversionSuccessRate,
  };
}

/**
 * 빈 리포트 생성 (팀이 없을 때)
 */
function createEmptyReport(
  associationId: string,
  fromDate: Timestamp,
  toDate: Timestamp
): AssociationReportOutput {
  return {
    associationId,
    period: {
      from: fromDate.toDate().toISOString().split("T")[0],
      to: toDate.toDate().toISOString().split("T")[0],
    },
    totalBookings: 0,
    byTeamType: {
      MEMBER: 0,
      NON_MEMBER: 0,
      ACADEMY: 0,
    },
    byDecision: {
      APPLY: 0,
      REQUEST: 0,
      WAITLIST: 0,
      VIEW_ONLY: 0,
    },
    priorityUsage: {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    },
    byStatus: {
      CONFIRMED: 0,
      WAITLIST: 0,
      PENDING: 0,
    },
    topFacilities: [],
    conversionMetrics: {
      nonMemberDenies: 0,
      conversionRequests: 0,
      conversionSuccessRate: 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

