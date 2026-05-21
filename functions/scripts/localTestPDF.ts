// functions/scripts/localTestPDF.ts
// 🔥 로컬 단독 실행: PDF 생성 로직 검증
//
// 🎯 목적:
// - 에뮬레이터 없이 PDF 생성 로직만 테스트
// - Playwright, Handlebars, 한글 폰트 검증
// - 로컬 파일로 저장

import * as fs from "node:fs/promises";
import * as path from "path";
import { chromium } from "playwright";
import Handlebars from "handlebars";
import { generateChartSVG } from "../src/chartGenerator";

/**
 * 더미 리포트 데이터 생성
 */
function createDummyReportData() {
  return {
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
  };
}

/**
 * 템플릿 렌더링
 */
async function renderHtmlTemplate(
  data: any,
  teamName: string
): Promise<string> {
  // 템플릿 경로 (functions 디렉토리 기준)
  // __dirname은 scripts 디렉토리이므로 .. 으로 functions 루트로 이동
  const functionsRoot = path.resolve(__dirname, "..");
  const templatePath = path.join(functionsRoot, "templates", "monthly-report.html");
  const assetDir = path.join(functionsRoot, "templates", "assets");

  console.log(`📄 템플릿 경로: ${templatePath}`);
  console.log(`📁 에셋 경로: ${assetDir}`);

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
    ASSET_DIR: assetDir,
  };

  return template(renderData);
}

/**
 * HTML을 PDF로 변환 (Playwright)
 */
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  console.log("🌐 Playwright 브라우저 시작...");
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    console.log("📄 PDF 생성 중...");
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

    console.log("✅ PDF 생성 완료!");
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🚀 로컬 PDF 생성 테스트 시작");
    console.log("=".repeat(60));

    // 1. 더미 데이터 생성
    console.log("📊 더미 리포트 데이터 생성...");
    const reportData = createDummyReportData();
    const teamName = "테스트 팀";

    // 2. HTML 템플릿 렌더링
    console.log("🎨 HTML 템플릿 렌더링...");
    const html = await renderHtmlTemplate(reportData, teamName);

    // 3. PDF 생성
    console.log("📄 PDF 생성 중...");
    const pdfBuffer = await htmlToPdfBuffer(html);

    // 4. 로컬 파일로 저장
    const functionsRoot = path.resolve(__dirname, "..");
    const outputPath = path.join(
      functionsRoot,
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
    console.log("🎉 테스트 완료!");
  } catch (error: any) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

// 실행
main();

