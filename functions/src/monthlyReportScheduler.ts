// functions/src/monthlyReportScheduler.ts
// 🔥 월간 리포트 스케줄러: Cloud Scheduler → HTTP Trigger
//
// 🎯 핵심 원칙:
// - 매월 1일 00:05 KST 실행
// - 리포트 생성 → PDF 생성 → Storage 업로드 → Outbox 등록
// - 토큰 검증으로 보안 강화

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { generateMonthlyReport } from "./generateMonthlyReportFinal";
import {
  renderHtmlTemplate,
  htmlToPdfBuffer,
  uploadPdfToStorage,
  insertOutbox,
  generateStorageKey,
} from "./monthlyReportPDFGenerator";
import { ym, prevYm } from "./feeSystemCoreFinal";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 대상 월 계산 (KST 기준)
 * 
 * 매월 1일 00:05에 실행되므로 전월 리포트 생성
 */
function getTargetMonthKST(): string {
  const now = new Date();
  // KST = UTC + 9시간
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  // 전월 계산
  const lastMonth = new Date(kst.getFullYear(), kst.getMonth() - 1, 1);
  return ym(lastMonth);
}

/**
 * 리포트 데이터 집계
 */
async function buildReportData(
  teamId: string,
  reportMonth: string
): Promise<{
  report: any;
  teamName: string;
}> {
  // 기존 generateMonthlyReport 함수 사용
  const report = await generateMonthlyReport(teamId, reportMonth, "SYSTEM");

  // 팀 이름 조회
  const teamDoc = await db.doc(`teams/${teamId}`).get();
  const teamName = teamDoc.data()?.name || teamId;

  return { report, teamName };
}

/**
 * 월간 리포트 생성 및 발송 등록 HTTP 핸들러
 * 
 * 🔥 보안:
 * - X-CRON-TOKEN 헤더 검증
 * - Cloud Scheduler만 호출 가능
 */
export const generateMonthlyReportScheduler = onRequest(
  {
    region: "asia-northeast3",
    timeoutSeconds: 540, // 9분 (PDF 생성 시간 고려)
    memory: "1GiB", // Playwright 메모리 요구사항
  },
  async (req, res) => {
    // 🔒 토큰 검증
    const cronToken = req.get("X-CRON-TOKEN");
    const expectedToken = process.env.CRON_TOKEN;

    if (!expectedToken || cronToken !== expectedToken) {
      logger.warn("[Scheduler] 인증 실패", {
        hasToken: !!cronToken,
        hasExpected: !!expectedToken,
      });
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      logger.info("[Scheduler] 월간 리포트 생성 시작");

      // 대상 월 계산
      const reportMonth = getTargetMonthKST();
      logger.info(`[Scheduler] 대상 월: ${reportMonth}`);

      // 대상 팀 조회 (enableNewFeeSystem=true)
      const teamsSnap = await db
        .collection("teams")
        .where("enableNewFeeSystem", "==", true)
        .get();

      if (teamsSnap.empty) {
        logger.warn("[Scheduler] 대상 팀 없음");
        res.status(200).json({ ok: true, message: "No teams to process" });
        return;
      }

      const results: Array<{
        teamId: string;
        success: boolean;
        pdfUrl?: string;
        error?: string;
      }> = [];

      // 각 팀 처리
      for (const teamDoc of teamsSnap.docs) {
        const teamId = teamDoc.id;

        try {
          logger.info(`[Scheduler] 팀 처리 시작: ${teamId}`);

          // 1. 리포트 데이터 집계
          const { report, teamName } = await buildReportData(teamId, reportMonth);

          // 2. HTML 템플릿 렌더링
          const html = await renderHtmlTemplate(report, teamName);

          // 3. PDF 생성
          const pdfBuffer = await htmlToPdfBuffer(html);

          // 4. Storage 업로드
          const storageKey = generateStorageKey(teamId, reportMonth);
          const pdfUrl = await uploadPdfToStorage(pdfBuffer, storageKey);

          // 5. Outbox 등록
          await insertOutbox({
            type: "MONTHLY_REPORT",
            reportMonth,
            pdfUrl,
            teamId,
            status: "PENDING",
          });

          logger.info(`[Scheduler] 팀 처리 완료: ${teamId}`, { pdfUrl });

          results.push({
            teamId,
            success: true,
            pdfUrl,
          });
        } catch (error: any) {
          logger.error(`[Scheduler] 팀 처리 실패: ${teamId}`, error);
          results.push({
            teamId,
            success: false,
            error: error.message || String(error),
          });
        }
      }

      res.status(200).json({
        ok: true,
        reportMonth,
        processed: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      });
    } catch (error: any) {
      logger.error("[Scheduler] 실행 실패", error);
      res.status(500).json({
        error: error.message || String(error),
      });
    }
  }
);

