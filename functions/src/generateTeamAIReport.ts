// functions/src/generateTeamAIReport.ts
// 🔥 팀 AI 리포트 생성 (Callable)

import { onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { requireAdmin } from "./utils/requireAdmin";
import { checkUsageLimit } from "./utils/usageLimits";
import { getTeamUsage } from "./utils/usageHelper";
import { writeAuditLog } from "./utils/auditLog";

interface GenerateReportRequest {
  teamId: string;
  weekStart?: string; // YYYY-MM-DD 형식, 없으면 이번 주 월요일
}

interface AiReport {
  createdAt: admin.firestore.Timestamp;
  createdBy: string;
  weekStart: string;
  status: "queued" | "processing" | "done" | "failed";
  progress?: number;
  errorMessage?: string;
  updatedAt?: admin.firestore.Timestamp;
  summary: string;
  html?: string;
  pdfUrl?: string;
}

/**
 * 팀 AI 리포트 생성 (Callable)
 */
export const generateTeamAIReport = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const db = getFirestore(); // 🔥 함수 내부에서 초기화 (타임아웃 방지)
    const { teamId, weekStart } = request.data as GenerateReportRequest;
    const uid = request.auth?.uid;

    if (!uid) {
      throw new Error("인증이 필요합니다.");
    }

    if (!teamId) {
      throw new Error("teamId가 필요합니다.");
    }

    // 🔥 권한 체크: requireAdmin 유틸리티 사용 (team.owners, teams/{teamId}/members, team_members 모두 지원)
    try {
      await requireAdmin(teamId, uid);
      logger.info(`📊 [generateTeamAIReport] 팀 ${teamId} 리포트 생성 시작 (권한 확인 완료)`);
    } catch (authError: any) {
      logger.warn(`⚠️ [generateTeamAIReport] 권한 체크 실패:`, authError);
      throw authError; // HttpsError는 그대로 전달
    }

    try {

      // 1️⃣ 주간 시작일 계산
      const startDate = weekStart
        ? new Date(weekStart)
        : (() => {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일
            return new Date(now.setDate(diff));
          })();

      const weekStartStr = startDate.toISOString().split("T")[0]; // YYYY-MM-DD

      // 🔥 중복 생성 방지: 같은 주간 리포트가 이미 queued/done 상태인지 확인
      const existingReportsRef = db.collection(`teams/${teamId}/ai_reports`);
      const existingQuery = await existingReportsRef
        .where("weekStart", "==", weekStartStr)
        .where("status", "in", ["queued", "done"])
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        const existing = existingQuery.docs[0].data();
        if (existing.status === "queued") {
          throw new Error("이미 생성 중인 리포트가 있습니다. 잠시 후 다시 시도해주세요.");
        }
        if (existing.status === "done") {
          throw new Error("이미 생성된 리포트가 있습니다.");
        }
      }

      // 2️⃣ 리포트 문서 생성 (queued 상태)
      const reportRef = db.collection(`teams/${teamId}/ai_reports`).doc();
      const reportId = reportRef.id;

      const report: AiReport = {
        createdAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        createdBy: uid,
        weekStart: weekStartStr,
        status: "queued",
        summary: "리포트 생성 중...",
      };

      await reportRef.set(report);

      // 🔥 AuditLog 기록 (생성 시작)
      await writeAuditLog({
        teamId,
        action: "AI_REPORT_CREATED",
        actorUid: uid,
        actorRole: "admin",
        meta: {
          reportId,
          weekStart: weekStartStr,
        },
      });

      // 3️⃣ 백그라운드에서 리포트 생성 (비동기)
      generateReportContent(teamId, reportId, weekStartStr, uid).catch(async (error) => {
        logger.error(`❌ [generateTeamAIReport] 리포트 생성 실패:`, error);
        
        // 🔥 실패 상태 업데이트
        await reportRef.update({
          status: "failed",
          summary: `리포트 생성 실패: ${error.message}`,
          errorMessage: error.message,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 AuditLog 기록 (실패)
        await writeAuditLog({
          teamId,
          action: "AI_REPORT_FAILED",
          actorUid: uid,
          actorRole: "admin",
          meta: {
            reportId,
            error: error.message,
          },
        });
      });

      return {
        success: true,
        reportId,
        message: "리포트 생성이 시작되었습니다.",
      };
    } catch (error) {
      logger.error(`❌ [generateTeamAIReport] 오류:`, error);
      throw new Error(`리포트 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

/**
 * 리포트 내용 생성 (백그라운드)
 */
async function generateReportContent(
  teamId: string,
  reportId: string,
  weekStart: string,
  uid: string
): Promise<void> {
  const db = getFirestore(); // 🔥 함수 내부에서 초기화 (타임아웃 방지)
  
  try {
    const reportRef = db.doc(`teams/${teamId}/ai_reports/${reportId}`);

    // 🔥 중복 실행 방지: status 체크
    const currentReport = await reportRef.get();
    const currentData = currentReport.data();
    
    if (currentData?.status !== "queued") {
      logger.warn(`⚠️ [generateReportContent] 리포트 ${reportId}는 이미 처리 중입니다. status: ${currentData?.status}`);
      return; // 중복 실행 방지
    }

    // 🔥 권한 재확인
    try {
      await requireAdmin(teamId, uid);
    } catch (authError) {
      logger.warn(`⚠️ [generateReportContent] 권한 체크 실패:`, authError);
      await reportRef.update({
        status: "failed",
        errorMessage: "권한이 없습니다.",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // 🔥 사용량 체크
    const teamDoc = await db.doc(`teams/${teamId}`).get();
    const teamData = teamDoc.data();
    const plan = (teamData?.plan || "free") as "free" | "pro" | "academy_pro";
    
    const usage = await getTeamUsage(teamId);
    const limitCheck = checkUsageLimit({ plan, usage });
    
    if (!limitCheck.ok) {
      logger.warn(`⚠️ [generateReportContent] 사용량 한도 초과: ${limitCheck.reason}`);
      await reportRef.update({
        status: "failed",
        errorMessage: `사용량 한도 초과: ${limitCheck.reason}`,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // 1️⃣ 팀 데이터 수집
    const teamDoc = await db.doc(`teams/${teamId}`).get();
    const teamData = teamDoc.data();

    // 2️⃣ 주간 활동 데이터 수집
    const membersSnap = await db.collection(`teams/${teamId}/members`).get();
    const memberCount = membersSnap.size;

    // 출석 데이터
    const attendanceDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      attendanceDates.push(date.toISOString().split("T")[0]);
    }

    let totalAttendance = 0;
    for (const date of attendanceDates) {
      const attendanceRef = db.collection(`teams/${teamId}/attendance/${date}/items`);
      const attendanceSnap = await attendanceRef.get();
      totalAttendance += attendanceSnap.size;
    }

    // 회비 데이터
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const feesRef = db.collection(`teams/${teamId}/fees/${currentMonth}/payments`);
    const feesSnap = await feesRef.get();

    let paidCount = 0;
    let unpaidCount = 0;
    feesSnap.forEach((doc) => {
      const data = doc.data();
      const status = data.status || "unpaid";
      if (status === "paid") {
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    // 3️⃣ AI 요약 생성 (간단한 템플릿 기반, 나중에 OpenAI 연동 가능)
    const summary = `
📊 ${teamData?.name || "팀"} 주간 리포트 (${weekStart})

👥 회원: ${memberCount}명
✅ 출석: 총 ${totalAttendance}건
💰 회비: 납부 ${paidCount}명 / 미납 ${unpaidCount}명

이번 주 팀 활동이 활발했습니다. 출석률과 회비 납부율을 지속적으로 관리해주세요.
    `.trim();

    const html = `
      <html>
        <head><title>주간 리포트</title></head>
        <body>
          <h1>${teamData?.name || "팀"} 주간 리포트</h1>
          <p>기간: ${weekStart}</p>
          <pre>${summary}</pre>
        </body>
      </html>
    `;

    // 3️⃣ processing 상태로 전환
    await reportRef.update({
      status: "processing",
      progress: 50,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 4️⃣ 리포트 업데이트 (완료)
    await reportRef.update({
      status: "done",
      summary,
      html,
      progress: 100,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`✅ [generateReportContent] 리포트 ${reportId} 생성 완료`);
  } catch (error) {
    logger.error(`❌ [generateReportContent] 리포트 생성 실패:`, error);
    throw error;
  }
}

