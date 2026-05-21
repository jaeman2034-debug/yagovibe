// functions/src/pdfReportGeneratorFinal.ts
// 📄 월간 리포트 PDF 생성 (최종 완성본)
//
// HTML → PDF 변환
// 템플릿 포함

import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { MonthlyReport, ALERT_TYPES } from "./generateMonthlyReportFinal";
import { requireAdmin } from "./utils/requireAdmin";
import { teamEntitledForMonthlyFeeReportPremium } from "./lib/teamPlan";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const storage = getStorage();

/**
 * 📄 PDF HTML 템플릿 생성
 */
function generatePDFHTML(teamName: string, report: MonthlyReport): string {
  const monthLabel = `${report.month.substring(0, 4)}년 ${parseInt(report.month.substring(5))}월`;
  
  const alertsHTML = report.alerts.map((alert) => {
    let alertText = "";
    if (alert.type === ALERT_TYPES.UNPAID_2_MONTHS) {
      alertText = `2개월 연속 미납: ${alert.count}명`;
    } else if (alert.type === ALERT_TYPES.PAUSED_OVER_3_MONTHS) {
      alertText = `장기 휴원 (3개월 이상): ${alert.count}명`;
    } else if (alert.type === ALERT_TYPES.ANNUAL_FEE_UNPAID) {
      alertText = `연회비 미납: ${alert.count}명`;
    }
    return `<div style="padding: 8px; background: #fff3cd; border-left: 4px solid #ffc107; margin: 8px 0;">⚠️ ${alertText}</div>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #2563eb;
      font-size: 28px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
    }
    .card-title {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .card-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .card-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 8px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .stat-label {
      color: #666;
    }
    .stat-value {
      font-weight: bold;
      color: #333;
    }
    .alerts-section {
      margin: 30px 0;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { margin: 0; padding: 20px; }
      .summary-cards { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${teamName} 월간 운영 리포트</h1>
    <div class="subtitle">${monthLabel}</div>
  </div>

  <div class="summary-cards">
    <div class="card">
      <div class="card-title">총 회원</div>
      <div class="card-value">${report.memberStats.total}</div>
      <div class="card-label">활성: ${report.memberStats.active}명</div>
    </div>
    <div class="card">
      <div class="card-title">수입</div>
      <div class="card-value">${report.feeStats.paidAmount.toLocaleString()}원</div>
      <div class="card-label">예상: ${report.feeStats.expectedAmount.toLocaleString()}원</div>
    </div>
    <div class="card">
      <div class="card-title">미수</div>
      <div class="card-value">${report.feeStats.unpaidAmount.toLocaleString()}원</div>
      <div class="card-label">미납: ${report.feeStats.unpaidCount}명</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">회원 통계</div>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">총 회원 수</span>
        <span class="stat-value">${report.memberStats.total}명</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">활성 회원</span>
        <span class="stat-value">${report.memberStats.active}명</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">휴원 회원</span>
        <span class="stat-value">${report.memberStats.paused}명</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">탈퇴 회원</span>
        <span class="stat-value">${report.memberStats.deleted}명</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">회비 통계</div>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">기본 회비</span>
        <span class="stat-value">${report.feeStats.baseAmount.toLocaleString()}원</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">납부 대상</span>
        <span class="stat-value">${report.feeStats.targetCount}명</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">납부 완료</span>
        <span class="stat-value">${report.feeStats.paidCount}명</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">미납</span>
        <span class="stat-value">${report.feeStats.unpaidCount}명</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">예상 수입</span>
        <span class="stat-value">${report.feeStats.expectedAmount.toLocaleString()}원</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">실제 수입</span>
        <span class="stat-value">${report.feeStats.paidAmount.toLocaleString()}원</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">미수 금액</span>
        <span class="stat-value">${report.feeStats.unpaidAmount.toLocaleString()}원</span>
      </div>
    </div>
  </div>

  ${report.alerts.length > 0 ? `
  <div class="alerts-section">
    <div class="section-title">⚠️ 경고 사항</div>
    ${alertsHTML}
  </div>
  ` : ""}

  <div class="footer">
    생성 시각: ${new Date().toLocaleString("ko-KR")}<br>
    이 리포트는 자동으로 생성되었습니다.
  </div>
</body>
</html>
  `.trim();
}

/**
 * 📄 PDF 생성 Callable 함수
 */
export const generateMonthlyReportPDFCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    memory: "1GiB", // 🔥 메모리 증가 (PDF 생성은 무거움)
    timeoutSeconds: 120, // 🔥 타임아웃 증가
  },
  async (req) => {
    const { teamId, month } = req.data ?? {};
    const uid = req.auth?.uid;

    // 🔥 auth 로그 (디버깅용)
    logger.info("🔐 [PDF] auth check", { uid, hasAuth: !!req.auth });

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!teamId || !month) {
      throw new HttpsError("invalid-argument", "teamId와 month가 필요합니다.");
    }

    // 팀 정보 조회
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const team = teamSnap.data()!;
    const teamName = team.name || "팀";

    // 🔐 관리자 권한 확인 (공통 가드)
    await requireAdmin(teamId, uid);

    if (!teamEntitledForMonthlyFeeReportPremium(team)) {
      throw new HttpsError(
        "permission-denied",
        "월간 리포트 PDF는 Pro 플랜(결제 포함)에서 이용할 수 있습니다."
      );
    }

    // 월간 리포트 조회
    const reportRef = teamRef.collection("monthlyReports").doc(month);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "해당 월의 리포트가 없습니다. 먼저 리포트를 생성해주세요.");
    }

    const report = reportSnap.data() as MonthlyReport;

    // HTML 생성
    const html = generatePDFHTML(teamName, report);

    // PDF 생성 (puppeteer 사용 - 동적 import)
    try {
      // puppeteer는 선택적 의존성이므로 동적 import
      // @ts-ignore - puppeteer는 선택적 의존성
      const puppeteerModule = await import("puppeteer").catch(() => null);
      
      if (!puppeteerModule) {
        throw new Error("puppeteer not installed");
      }

      const puppeteer = puppeteerModule.default || puppeteerModule;
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
        printBackground: true,
      });

      await browser.close();

      // 🔥 Base64 리턴 대신 Storage에 업로드하고 signed URL 반환
      const filePath = `teams/${teamId}/reports/${month}/report.pdf`;
      
      try {
        const bucket = storage.bucket();
        logger.info("📦 [PDF] Storage bucket 가져오기 완료", { bucketName: bucket.name });
        
        const file = bucket.file(filePath);
        logger.info("📄 [PDF] 파일 객체 생성 완료", { filePath });

        // PDF 업로드
        await file.save(pdfBuffer, {
          contentType: "application/pdf",
          metadata: {
            metadata: {
              teamId,
              month,
              generatedBy: uid,
              generatedAt: new Date().toISOString(),
            },
          },
        });
        logger.info("✅ [PDF] Storage 업로드 완료", { filePath, size: pdfBuffer.length });

        // Signed URL 생성 (10분 유효)
        const [downloadUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 1000 * 60 * 10, // 10분
        });
        logger.info("🔗 [PDF] Signed URL 생성 완료", { downloadUrl: downloadUrl.substring(0, 50) + "..." });

        return {
          success: true,
          downloadUrl, // 🔥 Base64 대신 signed URL
          filename: `${teamName}_${month}_리포트.pdf`,
          filePath,
        };
      } catch (storageError: any) {
        logger.error("❌ [PDF] Storage 업로드 실패", {
          error: storageError.message,
          code: storageError.code,
          filePath,
        });
        throw new HttpsError(
          "internal",
          `Storage 업로드 실패: ${storageError.message || "알 수 없는 오류"}`,
          { originalError: storageError.message }
        );
      }

    } catch (error: any) {
      // puppeteer가 없으면 HTML만 반환
      logger.error("❌ [PDF] 생성 실패", error);
      
      // HTML도 Storage에 업로드 (fallback)
      try {
        const filePath = `teams/${teamId}/reports/${month}/report.html`;
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        
        await file.save(html, {
          contentType: "text/html;charset=utf-8",
        });
        
        const [downloadUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 1000 * 60 * 10,
        });
        
        return {
          success: true,
          downloadUrl,
          filename: `${teamName}_${month}_리포트.html`,
          note: "PDF 생성에 실패했습니다. HTML을 다운로드하세요.",
        };
      } catch (storageError: any) {
        logger.error("❌ [PDF] Storage 업로드도 실패", storageError);
        throw new HttpsError("internal", "PDF 생성 및 저장에 실패했습니다.", error);
      }
    }
  }
);

