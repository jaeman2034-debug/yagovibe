/**
 * Booking Report API
 * 대관 리포트 집계 및 생성
 * 
 * bookings.decision 기반 리포트 집계
 * 협회 설득/운영을 위한 데이터 증명
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type {
  BookingReportParams,
  BookingReportResult,
  BookingDashboardCard,
  TeamTypeStats,
  FacilityPriorityStats,
  ConversionTriggerStats,
} from "../types/bookingReport";
import { TeamStatus } from "../types/policy";
import { BookingPermission } from "../types/policy";

const db = admin.firestore();

/**
 * 대시보드 카드 조회 (간소화된 통계)
 * 
 * @example
 * ```typescript
 * const getBookingDashboard = httpsCallable(functions, "getBookingDashboard");
 * const result = await getBookingDashboard({
 *   associationId: "assoc-nowon-football"
 * });
 * ```
 */
export const getBookingDashboard = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { associationId } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!associationId) {
      throw new HttpsError(
        "invalid-argument",
        "associationId가 필요합니다."
      );
    }

    try {
      const card = await generateDashboardCard(associationId);
      return card;
    } catch (error) {
      logger.error(`Error getting booking dashboard: ${error}`);
      throw new HttpsError(
        "internal",
        "대시보드 통계 조회 중 오류가 발생했습니다."
      );
    }
  }
);

/**
 * 리포트 생성 (월간/기간별)
 * 
 * @example
 * ```typescript
 * const generateBookingReport = httpsCallable(functions, "generateBookingReport");
 * const result = await generateBookingReport({
 *   associationId: "assoc-nowon-football",
 *   startDate: "2025-01-01",
 *   endDate: "2025-01-31"
 * });
 * ```
 */
export const generateBookingReport = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60, // 집계 작업 시간 확보
  },
  async (req) => {
    const { associationId, startDate, endDate } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!associationId || !startDate || !endDate) {
      throw new HttpsError(
        "invalid-argument",
        "associationId, startDate, endDate가 모두 필요합니다."
      );
    }

    try {
      const start = startDate instanceof Timestamp ? startDate : Timestamp.fromDate(new Date(startDate));
      const end = endDate instanceof Timestamp ? endDate : Timestamp.fromDate(new Date(endDate));

      const report = await generateBookingReportData(associationId, start, end);
      return report;
    } catch (error) {
      logger.error(`Error generating booking report: ${error}`);
      throw new HttpsError(
        "internal",
        "리포트 생성 중 오류가 발생했습니다."
      );
    }
  }
);

/**
 * 대시보드 카드 생성 (간소화된 통계)
 */
async function generateDashboardCard(
  associationId: string
): Promise<BookingDashboardCard> {
  // 최근 30일 bookings 조회
  const thirtyDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  // 협회 소속 팀 조회
  const teamsSnapshot = await db
    .collection("teams")
    .where("associationId", "==", associationId)
    .get();

  const teamIds = teamsSnapshot.docs.map((doc) => doc.id);

  if (teamIds.length === 0) {
    return {
      totalApplications: 0,
      confirmedBookings: 0,
      waitlistBookings: 0,
      memberBookingRate: 0,
      recent7Days: 0,
    };
  }

  // 최근 30일 bookings 조회
  const bookingsSnapshot = await db
    .collection("bookings")
    .where("teamId", "in", teamIds.length > 10 ? teamIds.slice(0, 10) : teamIds) // Firestore 'in' 제한 (10개)
    .where("createdAt", ">=", thirtyDaysAgo)
    .get();

  // 추가 팀이 있으면 배치로 처리
  let allBookings = [...bookingsSnapshot.docs];
  if (teamIds.length > 10) {
    for (let i = 10; i < teamIds.length; i += 10) {
      const batch = teamIds.slice(i, i + 10);
      const batchSnapshot = await db
        .collection("bookings")
        .where("teamId", "in", batch)
        .where("createdAt", ">=", thirtyDaysAgo)
        .get();
      allBookings = [...allBookings, ...batchSnapshot.docs];
    }
  }

  const bookings = allBookings.map((doc) => doc.data());

  // 최근 7일
  const sevenDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const recent7Days = bookings.filter(
    (b) => b.createdAt && b.createdAt.toMillis() >= sevenDaysAgo.toMillis()
  ).length;

  // 상태별 집계
  const confirmedBookings = bookings.filter(
    (b) => b.status === "CONFIRMED"
  ).length;
  const waitlistBookings = bookings.filter(
    (b) => b.status === "WAITLIST"
  ).length;

  // 회원팀 bookings 집계
  const memberTeamIds = teamsSnapshot.docs
    .filter((doc) => doc.data().status === TeamStatus.MEMBER)
    .map((doc) => doc.id);

  const memberBookings = bookings.filter((b) =>
    memberTeamIds.includes(b.teamId)
  ).length;
  const memberBookingRate =
    bookings.length > 0 ? (memberBookings / bookings.length) * 100 : 0;

  // 시설별 집계 (가장 많이 사용된 시설)
  const facilityCounts: Record<string, { name: string; count: number }> = {};
  for (const booking of bookings) {
    const facilityId = booking.facilityId;
    if (facilityId) {
      if (!facilityCounts[facilityId]) {
        const facilityDoc = await db.doc(`facilities/${facilityId}`).get();
        facilityCounts[facilityId] = {
          name: facilityDoc.data()?.name || facilityId,
          count: 0,
        };
      }
      facilityCounts[facilityId].count++;
    }
  }

  const topFacility = Object.entries(facilityCounts)
    .sort(([, a], [, b]) => b.count - a.count)[0];

  return {
    totalApplications: bookings.length,
    confirmedBookings,
    waitlistBookings,
    memberBookingRate: Math.round(memberBookingRate * 10) / 10,
    recent7Days,
    topFacility: topFacility
      ? {
          facilityId: topFacility[0],
          facilityName: topFacility[1].name,
          bookingCount: topFacility[1].count,
        }
      : undefined,
  };
}

/**
 * 리포트 데이터 생성 (상세 집계)
 */
async function generateBookingReportData(
  associationId: string,
  startDate: Timestamp,
  endDate: Timestamp
): Promise<BookingReportResult> {
  // 협회 소속 팀 조회
  const teamsSnapshot = await db
    .collection("teams")
    .where("associationId", "==", associationId)
    .get();

  const teams = teamsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const teamIds = teams.map((t) => t.id);

  if (teamIds.length === 0) {
    throw new HttpsError("not-found", "협회에 소속된 팀이 없습니다.");
  }

  // 기간 내 bookings 조회 (배치 처리)
  let allBookings: admin.firestore.QueryDocumentSnapshot[] = [];
  
  for (let i = 0; i < teamIds.length; i += 10) {
    const batch = teamIds.slice(i, i + 10);
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("teamId", "in", batch)
      .where("createdAt", ">=", startDate)
      .where("createdAt", "<=", endDate)
      .get();
    
    allBookings = [...allBookings, ...bookingsSnapshot.docs];
  }

  const bookings = allBookings.map((doc) => doc.data());

  // 팀 유형별 집계
  const teamTypeStats = calculateTeamTypeStats(bookings, teams);

  // 시설별 우선권 사용률
  const facilityStats = await calculateFacilityStats(bookings, teams);

  // 전환 트리거 통계
  const conversionStats = await calculateConversionStats(
    associationId,
    startDate,
    endDate
  );

  // 리포트 저장
  const reportId = `booking-report-${associationId}-${Date.now()}`;
  const report: BookingReportResult = {
    reportId,
    associationId,
    period: {
      start: startDate,
      end: endDate,
    },
    generatedAt: Timestamp.now(),
    teamTypeStats,
    facilityStats,
    conversionStats,
    metadata: {
      totalBookings: bookings.length,
      totalFacilities: facilityStats.length,
      reportVersion: "1.0.0",
    },
  };

  // Firestore에 저장
  await db.collection("booking_reports").doc(reportId).set(report);

  logger.info(`Booking report generated: ${reportId}`);

  return report;
}

/**
 * 팀 유형별 통계 계산
 */
function calculateTeamTypeStats(
  bookings: any[],
  teams: any[]
): TeamTypeStats {
  const memberTeamIds = teams
    .filter((t) => t.status === TeamStatus.MEMBER)
    .map((t) => t.id);
  const academyTeamIds = teams
    .filter((t) => t.status === TeamStatus.ACADEMY)
    .map((t) => t.id);
  const nonMemberTeamIds = teams
    .filter((t) => t.status === TeamStatus.NON_MEMBER)
    .map((t) => t.id);

  const memberBookings = bookings.filter((b) =>
    memberTeamIds.includes(b.teamId)
  );
  const academyBookings = bookings.filter((b) =>
    academyTeamIds.includes(b.teamId)
  );
  const nonMemberBookings = bookings.filter((b) =>
    nonMemberTeamIds.includes(b.teamId)
  );

  return {
    MEMBER: {
      total: memberBookings.length,
      confirmed: memberBookings.filter((b) => b.status === "CONFIRMED").length,
      pending: memberBookings.filter((b) => b.status === "PENDING").length,
      waitlist: memberBookings.filter((b) => b.status === "WAITLIST").length,
    },
    ACADEMY: {
      total: academyBookings.length,
      requested: academyBookings.filter((b) => b.actionType === BookingPermission.REQUEST).length,
      confirmed: academyBookings.filter((b) => b.status === "CONFIRMED").length,
    },
    NON_MEMBER: {
      total: nonMemberBookings.length,
      waitlist: nonMemberBookings.filter((b) => b.status === "WAITLIST").length,
      viewOnly: nonMemberBookings.filter(
        (b) => b.actionType === BookingPermission.VIEW_ONLY
      ).length,
    },
  };
}

/**
 * 시설별 우선권 사용률 계산
 */
async function calculateFacilityStats(
  bookings: any[],
  teams: any[]
): Promise<FacilityPriorityStats[]> {
  const facilityMap: Record<string, any> = {};

  // 시설별 집계
  for (const booking of bookings) {
    const facilityId = booking.facilityId;
    if (!facilityId) continue;

    if (!facilityMap[facilityId]) {
      const facilityDoc = await db.doc(`facilities/${facilityId}`).get();
      const facilityData = facilityDoc.data();
      facilityMap[facilityId] = {
        facilityId,
        facilityName: facilityData?.name || facilityId,
        accessPolicy: facilityData?.accessPolicy || "PUBLIC_OPEN",
        totalBookings: 0,
        memberBookings: 0,
        academyBookings: 0,
        nonMemberBookings: 0,
      };
    }

    facilityMap[facilityId].totalBookings++;
    const team = teams.find((t) => t.id === booking.teamId);
    if (team?.status === TeamStatus.MEMBER) {
      facilityMap[facilityId].memberBookings++;
    } else if (team?.status === TeamStatus.ACADEMY) {
      facilityMap[facilityId].academyBookings++;
    } else {
      facilityMap[facilityId].nonMemberBookings++;
    }
  }

  // 우선권 사용률 계산
  return Object.values(facilityMap).map((facility: any) => ({
    ...facility,
    priorityUsageRate:
      facility.totalBookings > 0
        ? Math.round((facility.memberBookings / facility.totalBookings) * 100 * 10) / 10
        : 0,
  }));
}

/**
 * 전환 트리거 통계 계산
 */
async function calculateConversionStats(
  associationId: string,
  startDate: Timestamp,
  endDate: Timestamp
): Promise<ConversionTriggerStats> {
  // membership_conversions 조회
  const conversionsSnapshot = await db
    .collection("membership_conversions")
    .where("requestedAt", ">=", startDate)
    .where("requestedAt", "<=", endDate)
    .get();

  const conversions = conversionsSnapshot.docs.map((doc) => doc.data());

  // 협회 소속 팀만 필터링
  const teamsSnapshot = await db
    .collection("teams")
    .where("associationId", "==", associationId)
    .get();

  const teamIds = teamsSnapshot.docs.map((doc) => doc.id);
  const associationConversions = conversions.filter((c) =>
    teamIds.includes(c.teamId)
  );

  const requested = associationConversions.length;
  const approved = associationConversions.filter((c) => c.approvedAt).length;
  const pending = requested - approved;

  return {
    totalTriggers: requested, // showConversionCTA 클릭 수 (approximate)
    conversions: {
      requested,
      approved,
      pending,
    },
    conversionRate: requested > 0 ? Math.round((approved / requested) * 100 * 10) / 10 : 0,
  };
}

