/**
 * 월간 리포트 서비스 (내부 로직)
 * 
 * PDF 생성 로직을 서비스 레이어로 분리하여
 * Callable 함수와 Scheduler 함수에서 모두 재사용
 */

import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { chromium } from "playwright";
import { aggregateAssociationReport } from "../api/getAssociationReport";

const db = admin.firestore();
const storage = admin.storage();

/**
 * 월간 리포트 생성 파라미터
 */
export interface GenerateMonthlyReportParams {
  associationId: string;
  year: number;
  month: number;
}

/**
 * 월간 리포트 생성 결과
 */
export interface GenerateMonthlyReportResult {
  success: boolean;
  pdfUrl: string;
  filename: string;
  storageKey: string;
}

/**
 * 월간 리포트 생성 (내부 서비스 함수)
 * 
 * Callable 함수와 Scheduler 함수에서 모두 사용
 */
export async function generateMonthlyReportInternal(
  params: GenerateMonthlyReportParams
): Promise<GenerateMonthlyReportResult> {
  const { associationId, year, month } = params;

  try {
    // 협회 정보 조회
    const associationDoc = await db.doc(`associations/${associationId}`).get();
    if (!associationDoc.exists) {
      throw new Error(`협회를 찾을 수 없습니다: ${associationId}`);
    }
    const associationData = associationDoc.data();
    const associationName = associationData?.name || "협회";

    // 리포트 기간 계산
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const fromDate = Timestamp.fromDate(startDate);
    const toDate = Timestamp.fromDate(endDate);

    // 리포트 데이터 조회
    const report = await aggregateAssociationReport(
      associationId,
      fromDate,
      toDate
    );

    if (!report) {
      throw new Error("리포트 데이터를 찾을 수 없습니다.");
    }

    // HTML 템플릿 생성
    const html = generateReportHtml(report, associationName, year, month);

    // PDF 생성
    const pdfBuffer = await htmlToPdfBuffer(html);

    // Firebase Storage 업로드
    const storageKey = `reports/${associationId}/${year}-${String(month).padStart(2, "0")}.pdf`;
    const pdfUrl = await uploadPdfToStorage(pdfBuffer, storageKey);

    logger.info(`Monthly report PDF generated: ${storageKey}`, {
      associationId,
      year,
      month,
      pdfUrl: pdfUrl.substring(0, 50) + "...",
    });

    const filename = `${associationName}_${year}년_${month}월_운영리포트.pdf`;

    return {
      success: true,
      pdfUrl,
      filename,
      storageKey,
    };
  } catch (error: any) {
    logger.error(`Error generating monthly report: ${error}`, {
      associationId,
      year,
      month,
    });
    throw error;
  }
}

/**
 * HTML 템플릿 생성
 */
function generateReportHtml(
  report: any,
  associationName: string,
  year: number,
  month: number
): string {
  // 우선 배정 사용률 계산
  const priorityUsageRate =
    report.totalBookings > 0
      ? Math.round((report.priorityUsage.HIGH / report.totalBookings) * 100)
      : 0;

  // AI 해석 문장 생성
  const summarySentence1 = `이번 달에는 회원팀 우선 배정 사용률이 ${priorityUsageRate}%로, 전체 대관 요청 ${report.totalBookings}건 중 ${report.priorityUsage.HIGH}건이 회원팀에게 우선 배정되었습니다.`;
  
  const summarySentence2 =
    report.byDecision.WAITLIST > 0
      ? `비회원 대기 발생이 ${report.byDecision.WAITLIST}건으로 전환 유도 포인트가 확인되었습니다.`
      : `이번 달에는 모든 대관 요청이 처리되어 대기 건수가 없었습니다.`;

  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${associationName} 월간 운영 리포트</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
      padding: 40px;
      background: white;
      color: #1a1a1a;
      line-height: 1.6;
    }
    
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    .header-info {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #666;
      margin-top: 12px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: #f8f9fa;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .stat-card.blue {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    
    .stat-card.green {
      background: #f0fdf4;
      border-color: #86efac;
    }
    
    .stat-card.yellow {
      background: #fefce8;
      border-color: #fde047;
    }
    
    .stat-card.purple {
      background: #faf5ff;
      border-color: #c4b5fd;
    }
    
    .stat-card-title {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .stat-card-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    
    .stat-card-subtitle {
      font-size: 11px;
      color: #999;
    }
    
    .table-section {
      margin-bottom: 30px;
    }
    
    .table-section h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1a1a1a;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 1px solid #e5e7eb;
    }
    
    thead {
      background: #f8f9fa;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    
    td {
      padding: 12px;
      font-size: 14px;
      color: #1a1a1a;
      border-bottom: 1px solid #f3f4f6;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    .summary-section {
      background: #f8f9fa;
      border-left: 4px solid #2563eb;
      padding: 20px;
      margin-top: 30px;
    }
    
    .summary-section h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1a1a1a;
    }
    
    .summary-text {
      font-size: 14px;
      line-height: 1.8;
      color: #374151;
    }
    
    .summary-text p {
      margin-bottom: 8px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${associationName} 월간 운영 리포트</h1>
    <div class="header-info">
      <div>기간: ${year}년 ${monthNames[month - 1]}</div>
      <div>생성일: ${new Date().toLocaleDateString("ko-KR")}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card blue">
      <div class="stat-card-title">이번 달 대관 요청</div>
      <div class="stat-card-value">${report.totalBookings}</div>
      <div class="stat-card-subtitle">이번 달 전체 요청</div>
    </div>
    
    <div class="stat-card green">
      <div class="stat-card-title">우선 배정 사용률</div>
      <div class="stat-card-value">${priorityUsageRate}%</div>
      <div class="stat-card-subtitle">회원 우선권 사용</div>
    </div>
    
    <div class="stat-card yellow">
      <div class="stat-card-title">비회원 대기</div>
      <div class="stat-card-value">${report.byDecision.WAITLIST}</div>
      <div class="stat-card-subtitle">초과 수요 발생</div>
    </div>
    
    <div class="stat-card purple">
      <div class="stat-card-title">회원 전환 유도</div>
      <div class="stat-card-value">${report.conversionMetrics.nonMemberDenies}</div>
      <div class="stat-card-subtitle">정책 기반 전환</div>
    </div>
  </div>

  <div class="table-section">
    <h2>팀 유형별 현황</h2>
    <table>
      <thead>
        <tr>
          <th>팀 유형</th>
          <th>요청 수</th>
          <th>승인 수</th>
          <th>대기 수</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>회원팀 (MEMBER)</strong></td>
          <td>${report.byTeamType.MEMBER || 0}</td>
          <td>${report.byStatus.CONFIRMED || 0}</td>
          <td>${report.byStatus.WAITLIST || 0}</td>
        </tr>
        <tr>
          <td><strong>비회원팀 (NON_MEMBER)</strong></td>
          <td>${report.byTeamType.NON_MEMBER || 0}</td>
          <td>0</td>
          <td>${report.byDecision.WAITLIST || 0}</td>
        </tr>
        <tr>
          <td><strong>아카데미 (ACADEMY)</strong></td>
          <td>${report.byTeamType.ACADEMY || 0}</td>
          <td>${report.byStatus.CONFIRMED || 0}</td>
          <td>0</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="summary-section">
    <h2>요약</h2>
    <div class="summary-text">
      <p>${summarySentence1}</p>
      <p>${summarySentence2}</p>
    </div>
  </div>

  <div class="footer">
    본 리포트는 YAGO SPORTS 시스템에 의해 자동 생성되었습니다.
  </div>
</body>
</html>
  `.trim();
}

/**
 * HTML을 PDF로 변환 (Playwright 사용)
 */
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * PDF를 Firebase Storage에 업로드
 */
async function uploadPdfToStorage(
  pdfBuffer: Buffer,
  storageKey: string
): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(storageKey);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {
      cacheControl: "public, max-age=31536000",
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    },
  });

  // Signed URL 생성 (30일 유효)
  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
  });

  return downloadUrl;
}

