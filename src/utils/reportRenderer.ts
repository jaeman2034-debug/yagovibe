// src/utils/reportRenderer.ts
// 🔥 리포트 렌더러: HTML 템플릿 → PDF
//
// 🎯 핵심 원칙:
// - 템플릿은 순수 HTML/CSS
// - 입력은 순수 JSON
// - 페이지 브레이크 제어
// - 한글 폰트 지원

import type { MonthlyReportData } from "./reportGenerator";
import { generateChartSVG } from "./chartGenerator";

/**
 * 리포트 템플릿 입력 데이터
 */
export interface ReportTemplateInput {
  yyyyMM: string;
  teamName: string;
  generatedAt: string;
  memberStats: MonthlyReportData["memberStats"];
  feeStats: MonthlyReportData["feeStats"];
  alerts: MonthlyReportData["alerts"];
  chartSvg?: string;
  hasChart?: boolean;
}

/**
 * 템플릿 변수 치환
 */
function replaceTemplateVariables(
  template: string,
  data: ReportTemplateInput
): string {
  let result = template;

  // 단순 변수 치환 {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = (data as any)[key];
    return value !== undefined ? String(value) : match;
  });

  // 중첩 객체 접근 {{object.key}}
  result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, objKey, propKey) => {
    const obj = (data as any)[objKey];
    const value = obj?.[propKey];
    return value !== undefined ? String(value) : match;
  });

  // Handlebars 스타일 조건문 {{#if condition}}...{{/if}}
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    const value = (data as any)[condition];
    return value ? content : "";
  });

  // Handlebars 스타일 반복문 {{#each array}}...{{/each}}
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayKey, content) => {
    const array = (data as any)[arrayKey];
    if (!Array.isArray(array)) return "";
    return array.map((item: any) => {
      let itemContent = content;
      // {{type}}, {{count}} 같은 변수 치환
      itemContent = itemContent.replace(/\{\{(\w+)\}\}/g, (m, key) => {
        return item[key] !== undefined ? String(item[key]) : m;
      });
      return itemContent;
    }).join("");
  });

  return result;
}

/**
 * HTML 템플릿 로드
 */
async function loadTemplate(version: string = "v1"): Promise<{
  html: string;
  css: string;
}> {
  // 클라이언트 사이드에서는 동적 import 불가
  // 실제로는 서버 사이드에서 파일 시스템으로 읽어야 함
  // 여기서는 스텁으로 처리
  
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>월간 리포트 - {{yyyyMM}}</title>
  <style>
    /* CSS는 별도 파일에서 로드하거나 인라인으로 포함 */
    ${await loadTemplateCSS(version)}
  </style>
</head>
<body>
  <!-- 템플릿 내용은 별도 파일에서 로드 -->
  ${await loadTemplateHTML(version)}
</body>
</html>
  `;

  return {
    html: htmlTemplate,
    css: await loadTemplateCSS(version),
  };
}

/**
 * 템플릿 HTML 로드 (스텁)
 */
async function loadTemplateHTML(version: string): Promise<string> {
  // 실제로는 파일 시스템에서 읽어야 함
  // Cloud Functions에서는 fs.readFile 사용
  return `
    <header class="report-header">
      <h1>📊 월간 운영 리포트</h1>
      <div class="report-meta">
        <p><strong>팀:</strong> {{teamName}}</p>
        <p><strong>월:</strong> {{yyyyMM}}</p>
        <p><strong>생성일:</strong> {{generatedAt}}</p>
      </div>
    </header>
    <!-- 나머지 템플릿 내용 -->
  `;
}

/**
 * 템플릿 CSS 로드 (스텁)
 */
async function loadTemplateCSS(version: string): Promise<string> {
  // 실제로는 파일 시스템에서 읽어야 함
  return `
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Noto Sans KR', sans-serif; }
    .page-break { break-after: page; }
    .section { break-inside: avoid; }
  `;
}

/**
 * 리포트 데이터를 템플릿 입력으로 변환
 */
function prepareTemplateInput(
  data: MonthlyReportData,
  teamName: string
): ReportTemplateInput {
  // 차트 생성
  const chartSvg = generateChartSVG(data.feeStats);

  return {
    yyyyMM: data.yyyyMM,
    teamName,
    generatedAt: new Date().toLocaleString("ko-KR"),
    memberStats: data.memberStats,
    feeStats: {
      ...data.feeStats,
      baseAmount: data.feeStats.baseAmount.toLocaleString(),
      expectedAmount: data.feeStats.expectedAmount.toLocaleString(),
      paidAmount: data.feeStats.paidAmount.toLocaleString(),
      unpaidAmount: data.feeStats.unpaidAmount.toLocaleString(),
    },
    alerts: data.alerts,
    chartSvg,
    hasChart: true,
  };
}

/**
 * HTML 템플릿 렌더링
 * 
 * @param data 리포트 데이터
 * @param teamName 팀 이름
 * @param templateVersion 템플릿 버전
 * @returns 렌더링된 HTML
 */
export async function renderReportHTML(
  data: MonthlyReportData,
  teamName: string,
  templateVersion: string = "v1"
): Promise<string> {
  // 템플릿 로드
  const template = await loadTemplate(templateVersion);

  // 데이터 준비
  const input = prepareTemplateInput(data, teamName);

  // 변수 치환
  const html = replaceTemplateVariables(template.html, input);

  return html;
}

/**
 * PDF 생성 (클라이언트 사이드 스텁)
 * 
 * 🔥 실제 구현:
 * - 서버 사이드: Puppeteer 또는 Playwright 사용
 * - 클라이언트 사이드: jsPDF 또는 html2pdf.js 사용
 * 
 * @param html 렌더링된 HTML
 * @returns PDF ArrayBuffer
 */
export async function generatePDFFromHTML(html: string): Promise<ArrayBuffer> {
  // TODO: 실제 PDF 생성 라이브러리 연동
  // 서버 사이드 예시:
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.setContent(html);
  // const pdf = await page.pdf({ format: 'A4' });
  // await browser.close();
  // return pdf;

  // 클라이언트 사이드 스텁
  console.warn("[ReportRenderer] PDF 생성은 서버 사이드에서 처리해야 합니다.");
  return new ArrayBuffer(0);
}

