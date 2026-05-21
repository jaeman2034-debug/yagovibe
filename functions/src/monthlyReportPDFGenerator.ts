// functions/src/monthlyReportPDFGenerator.ts
// 🔥 월간 리포트 PDF 생성: Playwright + Handlebars
//
// 🎯 핵심 원칙:
// - 템플릿은 파일 시스템에서 로드
// - Handlebars로 렌더링
// - Playwright로 PDF 생성
// - 한글 폰트 지원

import * as fs from "node:fs/promises";
import * as path from "node:path";
import Handlebars from "handlebars";
import { chromium } from "playwright";
import { FieldValue } from "firebase-admin/firestore";
import type { MonthlyReport } from "./generateMonthlyReportFinal";
import { generateChartSVG } from "./chartGenerator";
import { initFirebaseAdmin, admin } from "./firebaseAdmin";

// Firebase Admin 초기화 (로컬 실행 환경용)
initFirebaseAdmin();

const db = admin.firestore();
const storage = admin.storage();

/**
 * 템플릿 렌더링
 * 
 * @param data 리포트 데이터
 * @param teamName 팀 이름
 * @returns 렌더링된 HTML
 */
export async function renderHtmlTemplate(
  data: MonthlyReport,
  teamName: string
): Promise<string> {
  // 템플릿 경로
  const templatePath = path.join(process.cwd(), "templates", "monthly-report.html");
  const assetDir = path.join(process.cwd(), "templates", "assets");

  // 템플릿 로드
  const html = await fs.readFile(templatePath, "utf-8");

  // Handlebars 컴파일
  const template = Handlebars.compile(html, { noEscape: true });

  // 차트 생성
  const chartSvg = generateChartSVG(data.feeStats);

  // 렌더링 데이터 준비
  const renderData = {
    reportMonth: data.month,
    teamName,
    generatedAt: new Date().toLocaleString("ko-KR"),
    memberStats: data.memberStats,
    feeStats: {
      baseAmount: data.feeStats.baseAmount.toLocaleString(),
      targetCount: data.feeStats.targetCount,
      paidCount: data.feeStats.paidCount,
      unpaidCount: data.feeStats.unpaidCount,
      expectedAmount: data.feeStats.expectedAmount.toLocaleString(),
      paidAmount: data.feeStats.paidAmount.toLocaleString(),
      unpaidAmount: data.feeStats.unpaidAmount.toLocaleString(),
    },
    alerts: data.alerts,
    hasChart: true,
    chartSvg,
    ASSET_DIR: assetDir, // 폰트 경로
  };

  return template(renderData);
}

/**
 * HTML을 PDF로 변환 (Playwright)
 * 
 * @param html 렌더링된 HTML
 * @returns PDF Buffer
 */
export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * PDF를 Storage에 업로드
 * 
 * @param pdfBuffer PDF 버퍼
 * @param storageKey 스토리지 키
 * @returns 다운로드 URL
 */
export async function uploadPdfToStorage(
  pdfBuffer: Buffer,
  storageKey: string
): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(storageKey);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  // 공개 URL 생성 (또는 Presigned URL)
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storageKey}`;
}

/**
 * Outbox에 발송 대기 레코드 등록
 * 
 * @param params Outbox 파라미터
 */
export async function insertOutbox(params: {
  type: string;
  reportMonth: string;
  pdfUrl: string;
  teamId: string;
  status: string;
}): Promise<void> {
  const outboxRef = db.collection("notificationOutbox").doc();
  
  await outboxRef.set({
    ...params,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    attempt: 0,
    nextAttemptAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 스토리지 키 생성
 * 
 * @param teamId 팀 ID
 * @param reportMonth 리포트 월 (YYYY-MM)
 * @returns 스토리지 키
 */
export function generateStorageKey(teamId: string, reportMonth: string): string {
  return `reports/team_${teamId}/monthly/${reportMonth}/monthly_report_v1.pdf`;
}

/**
 * PDF 생성 및 로컬 저장 (테스트용)
 * 
 * @param teamId 팀 ID
 */
export async function generateMonthlyReportForTeam(teamId: string): Promise<void> {
  console.log("📊 PDF 테스트 시작");
  console.log(`팀 ID: ${teamId}`);
  console.log("=".repeat(60));

  try {
    // 1. 더미 리포트 데이터 생성
    console.log("📊 더미 리포트 데이터 생성...");
    const reportData: MonthlyReport = {
      month: "2025-01",
      memberStats: {
        total: 40,
        active: 35,
        paused: 3,
        deleted: 2,
      },
      feeStats: {
        baseAmount: 20000,
        targetCount: 35,
        paidCount: 30,
        unpaidCount: 5,
        expectedAmount: 700000,
        paidAmount: 600000,
        unpaidAmount: 100000,
      },
      alerts: [
        { type: "UNPAID_2_MONTHS", count: 2 },
        { type: "PAUSED_OVER_3_MONTHS", count: 1 },
        { type: "ANNUAL_FEE_UNPAID", count: 4 },
      ],
      generatedAt: new Date(),
      generatedBy: "TEST",
    };
    const teamName = "테스트 팀";

    // 2. HTML 템플릿 렌더링
    console.log("🎨 HTML 템플릿 렌더링...");
    const html = await renderHtmlTemplate(reportData, teamName);

    // 3. PDF 생성
    console.log("📄 Playwright로 PDF 생성 중...");
    const pdfBuffer = await htmlToPdfBuffer(html);

    // 4. 로컬 파일로 저장
    const outputPath = path.join(
      process.cwd(),
      "output",
      `monthly_report_${reportData.month}.pdf`
    );

    // output 디렉토리 생성
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(outputPath, pdfBuffer);
    console.log(`✅ PDF 저장 완료: ${outputPath}`);
    console.log(`📊 파일 크기: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    console.log("=".repeat(60));
    console.log("🎉 PDF 테스트 완료!");
  } catch (error: any) {
    console.error("❌ 오류 발생:", error);
    throw error;
  }
}

