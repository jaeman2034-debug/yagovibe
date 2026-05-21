// src/utils/reportGenerator.ts
// 🔥 리포트 생성 유틸: CSV/PDF 생성
//
// 🎯 핵심 원칙:
// - 순수 함수 (부수 효과 없음)
// - 데이터만 받아서 파일 생성

/**
 * 월간 리포트 데이터 타입
 */
export interface MonthlyReportData {
  teamId: string;
  yyyyMM: string;
  memberStats: {
    total: number;
    active: number;
    paused: number;
    deleted: number;
  };
  feeStats: {
    baseAmount: number;
    targetCount: number;
    paidCount: number;
    unpaidCount: number;
    expectedAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  };
  alerts: Array<{
    type: string;
    count: number;
  }>;
}

/**
 * CSV 생성
 * 
 * @param data 리포트 데이터
 * @returns CSV 문자열
 */
export async function generateMonthlyReportCSV(
  data: MonthlyReportData
): Promise<string> {
  const lines: string[] = [];
  
  // 헤더
  lines.push("항목,값");
  lines.push(`팀 ID,${data.teamId}`);
  lines.push(`월,${data.yyyyMM}`);
  lines.push("");
  
  // 회원 통계
  lines.push("회원 통계");
  lines.push(`총 회원,${data.memberStats.total}`);
  lines.push(`활성 회원,${data.memberStats.active}`);
  lines.push(`휴원,${data.memberStats.paused}`);
  lines.push(`삭제,${data.memberStats.deleted}`);
  lines.push("");
  
  // 회비 통계
  lines.push("회비 통계");
  lines.push(`기본 금액,${data.feeStats.baseAmount}`);
  lines.push(`대상 인원,${data.feeStats.targetCount}`);
  lines.push(`납부 인원,${data.feeStats.paidCount}`);
  lines.push(`미납 인원,${data.feeStats.unpaidCount}`);
  lines.push(`예상 금액,${data.feeStats.expectedAmount}`);
  lines.push(`납부 금액,${data.feeStats.paidAmount}`);
  lines.push(`미납 금액,${data.feeStats.unpaidAmount}`);
  lines.push("");
  
  // 알림
  if (data.alerts.length > 0) {
    lines.push("알림");
    for (const alert of data.alerts) {
      lines.push(`${alert.type},${alert.count}명`);
    }
  }
  
  return lines.join("\n");
}

/**
 * PDF 생성 (HTML → PDF)
 * 
 * 🔥 클라이언트 사이드에서는 제한적:
 * - jsPDF 또는 html2pdf.js 사용 가능
 * - 서버 사이드에서는 Puppeteer 권장
 * 
 * @param data 리포트 데이터
 * @returns PDF ArrayBuffer
 */
export async function generateMonthlyReportPDF(
  data: MonthlyReportData
): Promise<ArrayBuffer> {
  // HTML 템플릿 생성
  const html = generatePDFHTML(data);
  
  // 클라이언트 사이드 PDF 생성 (jsPDF 또는 html2pdf.js)
  // TODO: 실제 PDF 생성 라이브러리 연동
  // 예: html2pdf.js 또는 jsPDF
  
  // 스텁: HTML을 텍스트로 변환 (실제로는 PDF 생성)
  const textEncoder = new TextEncoder();
  return textEncoder.encode(html).buffer;
}

/**
 * PDF용 HTML 템플릿 생성
 */
function generatePDFHTML(data: MonthlyReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>월간 리포트 - ${data.yyyyMM}</title>
  <style>
    body {
      font-family: 'Noto Sans KR', sans-serif;
      padding: 40px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      color: #1e40af;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    .alert {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 10px 0;
    }
    .stat-card {
      display: inline-block;
      background-color: #f9fafb;
      padding: 20px;
      margin: 10px;
      border-radius: 8px;
      min-width: 150px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .stat-label {
      color: #6b7280;
      font-size: 14px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>📊 월간 운영 리포트</h1>
  <p><strong>팀:</strong> ${data.teamId}</p>
  <p><strong>월:</strong> ${data.yyyyMM}</p>
  <p><strong>생성일:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
  
  <div class="section">
    <h2>회원 통계</h2>
    <div class="stat-card">
      <div class="stat-value">${data.memberStats.total}</div>
      <div class="stat-label">총 회원</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.memberStats.active}</div>
      <div class="stat-label">활성 회원</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.memberStats.paused}</div>
      <div class="stat-label">휴원</div>
    </div>
  </div>
  
  <div class="section">
    <h2>회비 통계</h2>
    <table>
      <tr>
        <th>항목</th>
        <th>값</th>
      </tr>
      <tr>
        <td>기본 금액</td>
        <td>${data.feeStats.baseAmount.toLocaleString()}원</td>
      </tr>
      <tr>
        <td>대상 인원</td>
        <td>${data.feeStats.targetCount}명</td>
      </tr>
      <tr>
        <td>납부 인원</td>
        <td>${data.feeStats.paidCount}명</td>
      </tr>
      <tr>
        <td>미납 인원</td>
        <td>${data.feeStats.unpaidCount}명</td>
      </tr>
      <tr>
        <td>예상 금액</td>
        <td>${data.feeStats.expectedAmount.toLocaleString()}원</td>
      </tr>
      <tr>
        <td>납부 금액</td>
        <td>${data.feeStats.paidAmount.toLocaleString()}원</td>
      </tr>
      <tr>
        <td>미납 금액</td>
        <td>${data.feeStats.unpaidAmount.toLocaleString()}원</td>
      </tr>
    </table>
  </div>
  
  ${data.alerts.length > 0 ? `
  <div class="section">
    <h2>알림</h2>
    ${data.alerts.map(alert => `
      <div class="alert">
        <strong>${alert.type}:</strong> ${alert.count}명
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    <p>이 리포트는 YAGO SPORTS에서 자동 생성되었습니다.</p>
    <p>생성 시각: ${new Date().toLocaleString('ko-KR')}</p>
  </div>
</body>
</html>
  `.trim();
}

