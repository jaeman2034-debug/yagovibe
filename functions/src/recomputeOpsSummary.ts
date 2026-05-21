// functions/src/recomputeOpsSummary.ts
// 🔥 팀 운영 액션 요약 재계산 (ops/summary 생성/갱신)

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

interface OpsCard {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warn" | "urgent";
  actionPath: string;
  count?: number;
  icon?: string;
}

interface OpsSummary {
  updatedAt: admin.firestore.Timestamp;
  unpaidCount: number;
  unpaidAmountTotal: number;
  nextEventAt?: admin.firestore.Timestamp;
  nextEventTitle?: string | null;
  attendanceOpenEventId?: string | null;
  attendancePendingCount: number;
  pendingVotesCount: number;
  cards: OpsCard[];
  latestAiReportId?: string | null;
  latestAiReportWeekStart?: string | null;
}

/**
 * 팀의 ops/summary 재계산
 */
async function recomputeOpsSummary(teamId: string): Promise<void> {
  const db = getFirestore(); // 🔥 함수 내부에서 초기화 (타임아웃 방지)
  
  try {
    logger.info(`🔄 [recomputeOpsSummary] 팀 ${teamId} 요약 재계산 시작`);

    // 1️⃣ 미납 회비 계산 (teams/{teamId}/fees/{YYYY-MM}/payments)
    let unpaidCount = 0;
    let unpaidAmountTotal = 0;

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const feesRef = db.collection(`teams/${teamId}/fees/${currentMonth}/payments`);
      const paymentsSnap = await feesRef.get();

      paymentsSnap.forEach((doc) => {
        const data = doc.data();
        const status = data.status || "unpaid";
        const dueAmount = data.dueAmount ?? data.baseAmount ?? 0;
        const paidAmount = data.paidAmount ?? 0;

        if (status === "unpaid" || paidAmount < dueAmount) {
          unpaidCount++;
          unpaidAmountTotal += dueAmount - paidAmount;
        }
      });
    } catch (error) {
      logger.warn(`⚠️ [recomputeOpsSummary] 회비 조회 실패: ${error}`);
    }

    // 2️⃣ 출석 체크 진행 중인 이벤트 확인 (teams/{teamId}/attendance/{date}/items)
    let attendanceOpenEventId: string | null = null;
    let attendancePendingCount = 0;

    try {
      // 오늘 날짜 기준으로 출석 이벤트 확인
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const attendanceRef = db.collection(`teams/${teamId}/attendance/${today}/items`);
      const attendanceSnap = await attendanceRef.get();

      if (!attendanceSnap.empty) {
        attendanceOpenEventId = today;
        // 미응답 멤버 수 계산 (members 컬렉션과 비교)
        const membersRef = db.collection(`teams/${teamId}/members`);
        const membersSnap = await membersRef.get();
        const totalMembers = membersSnap.size;
        const respondedCount = attendanceSnap.size;
        attendancePendingCount = Math.max(0, totalMembers - respondedCount);
      }
    } catch (error) {
      logger.warn(`⚠️ [recomputeOpsSummary] 출석 조회 실패: ${error}`);
    }

    // 3️⃣ 다음 일정 확인 (teams/{teamId}/schedules 또는 events)
    let nextEventAt: admin.firestore.Timestamp | undefined;
    let nextEventTitle: string | null = null;

    try {
      // schedules 컬렉션이 있다면 사용, 없으면 attendance에서 다음 날짜 찾기
      const schedulesRef = db.collection(`teams/${teamId}/schedules`);
      const schedulesSnap = await schedulesRef
        .where("date", ">=", admin.firestore.Timestamp.now())
        .orderBy("date", "asc")
        .limit(1)
        .get();

      if (!schedulesSnap.empty) {
        const nextEvent = schedulesSnap.docs[0].data();
        nextEventAt = nextEvent.date as admin.firestore.Timestamp;
        nextEventTitle = nextEvent.title || nextEvent.event || null;
      }
    } catch (error) {
      logger.warn(`⚠️ [recomputeOpsSummary] 일정 조회 실패: ${error}`);
    }

    // 4️⃣ 진행 중인 투표 확인 (teams/{teamId}/assemblies/{assemblyId}/agendas/{agendaId}/votes)
    let pendingVotesCount = 0;

    try {
      const assembliesRef = db.collection(`teams/${teamId}/assemblies`);
      const assembliesSnap = await assembliesRef
        .where("status", "==", "active")
        .get();

      for (const assemblyDoc of assembliesSnap.docs) {
        const agendasRef = assemblyDoc.ref.collection("agendas");
        const agendasSnap = await agendasRef.get();

        for (const agendaDoc of agendasSnap.docs) {
          const votesRef = agendaDoc.ref.collection("votes");
          const votesSnap = await votesRef.get();
          // TODO: 실제 미투표 멤버 수 계산 (members 수 - votes 수)
          const membersRef = db.collection(`teams/${teamId}/members`);
          const membersSnap = await membersRef.get();
          pendingVotesCount += Math.max(0, membersSnap.size - votesSnap.size);
        }
      }
    } catch (error) {
      logger.warn(`⚠️ [recomputeOpsSummary] 투표 조회 실패: ${error}`);
    }

    // 5️⃣ 최신 AI 리포트 확인 (teams/{teamId}/ai_reports)
    let latestAiReportId: string | null = null;
    let latestAiReportWeekStart: string | null = null;

    try {
      const aiReportsRef = db.collection(`teams/${teamId}/ai_reports`);
      const latestReportSnap = await aiReportsRef
        .where("status", "==", "done")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!latestReportSnap.empty) {
        const latestReport = latestReportSnap.docs[0];
        latestAiReportId = latestReport.id;
        latestAiReportWeekStart = latestReport.data().weekStart || null;
      }
    } catch (error) {
      logger.warn(`⚠️ [recomputeOpsSummary] AI 리포트 조회 실패: ${error}`);
    }

    // 6️⃣ 카드 배열 생성 (UI 직접 소비용)
    const cards: OpsCard[] = [];

    // 미납 카드 (urgent)
    if (unpaidCount > 0) {
      cards.push({
        id: "unpaid",
        title: "미납 회비",
        message: `${unpaidCount}명 미납${unpaidAmountTotal > 0 ? ` (${unpaidAmountTotal.toLocaleString()}원)` : ""}`,
        severity: "urgent",
        actionPath: `/sports-hub`, // 실제 경로는 프론트에서 sportType 기반으로 결정
        count: unpaidCount,
        icon: "💰",
      });
    }

    // 출석 체크 카드 (warn)
    if (attendanceOpenEventId) {
      cards.push({
        id: "attendance",
        title: "출석 체크 필요",
        message: attendancePendingCount > 0 ? `미응답 ${attendancePendingCount}명` : "모든 멤버 응답 완료",
        severity: attendancePendingCount > 0 ? "warn" : "info",
        actionPath: `/sports-hub`, // 실제 경로는 프론트에서 결정
        count: attendancePendingCount,
        icon: "✅",
      });
    }

    // 다음 일정 카드 (info)
    if (nextEventAt && nextEventTitle) {
      cards.push({
        id: "schedule",
        title: "다가오는 일정",
        message: nextEventTitle,
        severity: "info",
        actionPath: `/sports-hub`,
        icon: "📅",
      });
    }

    // 투표 카드 (warn)
    if (pendingVotesCount > 0) {
      cards.push({
        id: "votes",
        title: "진행 중인 투표",
        message: `미투표 ${pendingVotesCount}명`,
        severity: "warn",
        actionPath: `/sports-hub`,
        count: pendingVotesCount,
        icon: "🗳️",
      });
    }

    // AI 리포트 카드 (info) - 최신 리포트가 있으면 표시
    if (latestAiReportId && latestAiReportWeekStart) {
      cards.push({
        id: "ai-report",
        title: "이번 주 AI 리포트",
        message: `${latestAiReportWeekStart} 주간 리포트 확인`,
        severity: "info",
        actionPath: `/home?report=${latestAiReportId}`, // 모달 열기 또는 페이지 이동
        icon: "🤖",
      });
    }

    // 7️⃣ ops/summary 문서 저장
    const summary: OpsSummary = {
      updatedAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      unpaidCount,
      unpaidAmountTotal,
      nextEventAt,
      nextEventTitle,
      attendanceOpenEventId,
      attendancePendingCount,
      pendingVotesCount,
      cards,
      latestAiReportId,
      latestAiReportWeekStart,
    };

    await db.doc(`teams/${teamId}/ops/summary`).set(summary, { merge: true });

    logger.info(`✅ [recomputeOpsSummary] 팀 ${teamId} 요약 재계산 완료`, {
      unpaidCount,
      attendancePendingCount,
      pendingVotesCount,
    });
  } catch (error) {
    logger.error(`❌ [recomputeOpsSummary] 팀 ${teamId} 재계산 실패:`, error);
    throw error;
  }
}

// A) 이벤트 기반 트리거: 회비 변경 시
export const onPaymentWrite = onDocumentWritten(
  {
    document: "teams/{teamId}/fees/{month}/payments/{memberId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const teamId = event.params.teamId;
    await recomputeOpsSummary(teamId);
  }
);

// B) 이벤트 기반 트리거: 출석 변경 시
export const onAttendanceWrite = onDocumentWritten(
  {
    document: "teams/{teamId}/attendance/{date}/items/{itemId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const teamId = event.params.teamId;
    await recomputeOpsSummary(teamId);
  }
);

// C) 이벤트 기반 트리거: 일정 변경 시
export const onScheduleWrite = onDocumentWritten(
  {
    document: "teams/{teamId}/schedules/{scheduleId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const teamId = event.params.teamId;
    await recomputeOpsSummary(teamId);
  }
);

// D) 스케줄러 기반: 하루 2회 안전망 재계산
export const dailyOpsRecompute = onSchedule(
  {
    schedule: "every 12 hours",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    const db = getFirestore(); // 🔥 함수 내부에서 초기화 (타임아웃 방지)
    logger.info("🔄 [dailyOpsRecompute] 전체 팀 ops/summary 재계산 시작");
    const teamsSnap = await db.collection("teams").get();

    const promises = teamsSnap.docs.map((doc) => recomputeOpsSummary(doc.id));
    await Promise.all(promises);

    logger.info(`✅ [dailyOpsRecompute] ${teamsSnap.size}개 팀 재계산 완료`);
  }
);

