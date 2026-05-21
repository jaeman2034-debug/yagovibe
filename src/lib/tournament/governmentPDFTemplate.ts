/**
 * 🔥 구청 제출용 PDF 템플릿 (한글 깨짐 0%)
 * 
 * 표준 HTML 템플릿 - 한글 폰트 완전 임베딩
 * 구청 선호형 목차 구조
 */

import type { Tournament } from "@/types/tournament";

export interface GovernmentPDFData {
  tournament: Tournament;
  associationName: string;
  generatedAt: string;
  generatedBy: string;
  generatedByEmail?: string;
  
  // 각 섹션 데이터
  participantSummary?: {
    totalTeams: number;
    approvedTeams: number;
    totalPlayers: number;
    verifiedPlayers: number;
  };
  
  drawResult?: {
    executedAt: string;
    executedBy: string;
    algorithmVersion: string;
    groups: Array<{
      groupId: string;
      teams: Array<{ teamId: string; teamName: string }>;
    }>;
  };
  
  matchSchedule?: Array<{
    date: string;
    facility: string;
    time: string;
    homeTeam: string;
    awayTeam: string;
  }>;
  
  matchResults?: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    score: string;
    status: string;
  }>;
  
  operationLogs?: Array<{
    timestamp: string;
    actor: string;
    action: string;
    detail: string;
  }>;
  
  qrCheckinSummary?: {
    totalCheckins: number;
    successCount: number;
    deniedCount: number;
  };
}

/**
 * 🔒 표준 HTML 헤더 (절대 수정 금지)
 */
const STANDARD_HTML_HEADER = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>대회 운영 보고서</title>
  <style>
    @font-face {
      font-family: "NotoSansKR";
      src: url("./fonts/NotoSansKR-Regular.otf") format("opentype");
    }
    body {
      font-family: "NotoSansKR", "Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif;
      white-space: pre-wrap;
      word-break: keep-all;
      line-height: 1.6;
      padding: 20mm;
      font-size: 11pt;
      color: #000;
    }
    h1, h2, h3 {
      font-weight: 700;
      color: #1a1a1a;
    }
    h1 {
      font-size: 20pt;
      margin-bottom: 10mm;
      border-bottom: 3px solid #000;
      padding-bottom: 5mm;
    }
    h2 {
      font-size: 16pt;
      margin-top: 15mm;
      margin-bottom: 8mm;
      border-bottom: 2px solid #333;
      padding-bottom: 3mm;
    }
    h3 {
      font-size: 13pt;
      margin-top: 10mm;
      margin-bottom: 5mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8mm 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #333;
      padding: 6px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: 700;
    }
    .page-break {
      page-break-before: always;
    }
    .footer {
      margin-top: 20mm;
      padding-top: 10mm;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
    .summary-box {
      background: #f9f9f9;
      border: 1px solid #ddd;
      padding: 10mm;
      margin: 8mm 0;
    }
    .summary-box p {
      margin: 3mm 0;
    }
  </style>
</head>
<body>`;

/**
 * 표지 페이지
 */
function renderCoverPage(data: GovernmentPDFData): string {
  return `
    <div style="text-align: center; padding: 40mm 0;">
      <h1 style="font-size: 24pt; border: none; padding: 0; margin-bottom: 20mm;">
        ${data.tournament.name}
      </h1>
      <h2 style="font-size: 18pt; border: none; padding: 0; margin-bottom: 30mm;">
        운영 보고서
      </h2>
      <div style="margin-top: 40mm;">
        <p style="font-size: 12pt; margin: 5mm 0;">
          <strong>주관:</strong> ${data.associationName}
        </p>
        <p style="font-size: 12pt; margin: 5mm 0;">
          <strong>생성일:</strong> ${data.generatedAt}
        </p>
        <p style="font-size: 12pt; margin: 5mm 0;">
          <strong>생성자:</strong> ${data.generatedBy}
        </p>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

/**
 * 대회 개요
 */
function renderTournamentOverview(data: GovernmentPDFData): string {
  const t = data.tournament;
  return `
    <h2>1. 대회 개요</h2>
    <div class="summary-box">
      <p><strong>대회명:</strong> ${t.name}</p>
      <p><strong>기간:</strong> ${t.startDate} ~ ${t.endDate}</p>
      <p><strong>장소:</strong> ${t.location}</p>
      <p><strong>주관:</strong> ${data.associationName}</p>
      <p><strong>참가 팀 수:</strong> ${t.teamCount}팀</p>
      ${t.description ? `<p><strong>대회 설명:</strong> ${t.description}</p>` : ""}
    </div>
  `;
}

/**
 * 참가 및 검수 현황
 */
function renderParticipantStatus(data: GovernmentPDFData): string {
  if (!data.participantSummary) return "";
  
  const ps = data.participantSummary;
  return `
    <div class="page-break"></div>
    <h2>2. 참가 및 검수 현황</h2>
    <table>
      <tr>
        <th>항목</th>
        <th>수량</th>
        <th>비고</th>
      </tr>
      <tr>
        <td>신청 팀 수</td>
        <td>${ps.totalTeams}팀</td>
        <td>-</td>
      </tr>
      <tr>
        <td>승인 팀 수</td>
        <td>${ps.approvedTeams}팀</td>
        <td>검수 완료</td>
      </tr>
      <tr>
        <td>등록 선수 수</td>
        <td>${ps.totalPlayers}명</td>
        <td>-</td>
      </tr>
      <tr>
        <td>검증 완료 선수 수</td>
        <td>${ps.verifiedPlayers}명</td>
        <td>JoinKFA 검증 완료</td>
      </tr>
    </table>
  `;
}

/**
 * 조 추첨 결과
 */
function renderDrawResult(data: GovernmentPDFData): string {
  if (!data.drawResult) return "";
  
  const dr = data.drawResult;
  let groupsHTML = "";
  
  for (const group of dr.groups) {
    groupsHTML += `
      <h3>${group.groupId}조</h3>
      <table>
        <tr>
          <th>순번</th>
          <th>팀명</th>
        </tr>
        ${group.teams.map((team, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${team.teamName}</td>
          </tr>
        `).join("")}
      </table>
    `;
  }
  
  return `
    <div class="page-break"></div>
    <h2>3. 조 추첨 결과 (비대면)</h2>
    <div class="summary-box">
      <p><strong>추첨 일시:</strong> ${dr.executedAt}</p>
      <p><strong>실행자:</strong> ${dr.executedBy}</p>
      <p><strong>알고리즘 버전:</strong> ${dr.algorithmVersion}</p>
      <p><strong>추첨 방식:</strong> 시스템 비대면 자동 실행</p>
    </div>
    ${groupsHTML}
  `;
}

/**
 * 경기 일정표
 */
function renderMatchSchedule(data: GovernmentPDFData): string {
  if (!data.matchSchedule || data.matchSchedule.length === 0) return "";
  
  const scheduleRows = data.matchSchedule.map((match) => `
    <tr>
      <td>${match.date}</td>
      <td>${match.facility}</td>
      <td>${match.time}</td>
      <td>${match.homeTeam}</td>
      <td>vs</td>
      <td>${match.awayTeam}</td>
    </tr>
  `).join("");
  
  return `
    <div class="page-break"></div>
    <h2>4. 경기 일정표 (경기장별)</h2>
    <table>
      <tr>
        <th>날짜</th>
        <th>경기장</th>
        <th>시간</th>
        <th>홈팀</th>
        <th></th>
        <th>원정팀</th>
      </tr>
      ${scheduleRows}
    </table>
  `;
}

/**
 * 경기 결과 요약
 */
function renderMatchResults(data: GovernmentPDFData): string {
  if (!data.matchResults || data.matchResults.length === 0) return "";
  
  const resultRows = data.matchResults.map((result) => `
    <tr>
      <td>${result.date}</td>
      <td>${result.homeTeam}</td>
      <td>vs</td>
      <td>${result.awayTeam}</td>
      <td>${result.score}</td>
      <td>${result.status}</td>
    </tr>
  `).join("");
  
  return `
    <div class="page-break"></div>
    <h2>5. 경기 결과 요약</h2>
    <table>
      <tr>
        <th>날짜</th>
        <th>홈팀</th>
        <th></th>
        <th>원정팀</th>
        <th>스코어</th>
        <th>상태</th>
      </tr>
      ${resultRows}
    </table>
  `;
}

/**
 * 현장 운영 (QR 체크인)
 */
function renderOnSiteOperations(data: GovernmentPDFData): string {
  if (!data.qrCheckinSummary) return "";
  
  const qr = data.qrCheckinSummary;
  return `
    <div class="page-break"></div>
    <h2>6. 현장 운영 (QR 체크인)</h2>
    <div class="summary-box">
      <p><strong>총 체크인 시도:</strong> ${qr.totalCheckins}건</p>
      <p><strong>성공:</strong> ${qr.successCount}건</p>
      <p><strong>거부:</strong> ${qr.deniedCount}건</p>
    </div>
    <p style="margin-top: 10mm;">
      모든 선수는 경기 전 QR 코드를 통한 현장 체크인을 완료해야 하며,
      미승인 선수는 경기 참가가 불가능합니다.
    </p>
  `;
}

/**
 * 운영 로그 요약
 */
function renderOperationLogs(data: GovernmentPDFData): string {
  if (!data.operationLogs || data.operationLogs.length === 0) return "";
  
  const logRows = data.operationLogs.map((log) => `
    <tr>
      <td>${log.timestamp}</td>
      <td>${log.actor}</td>
      <td>${log.action}</td>
      <td>${log.detail}</td>
    </tr>
  `).join("");
  
  return `
    <div class="page-break"></div>
    <h2>7. 운영 로그 요약</h2>
    <table>
      <tr>
        <th>시각</th>
        <th>실행자</th>
        <th>작업</th>
        <th>상세</th>
      </tr>
      ${logRows}
    </table>
  `;
}

/**
 * 결론 및 책임 주체
 */
function renderConclusion(data: GovernmentPDFData): string {
  return `
    <div class="page-break"></div>
    <h2>8. 결론 및 책임 주체</h2>
    <div class="summary-box">
      <p>
        본 문서는 ${data.associationName} 공식 시스템을 통해
        대회 운영 데이터를 기반으로 자동 생성되었습니다.
      </p>
      <p style="margin-top: 5mm;">
        <strong>시스템 자동화 항목:</strong>
      </p>
      <ul style="margin: 3mm 0; padding-left: 20mm;">
        <li>조 추첨: 시스템 비대면 자동 실행</li>
        <li>경기 일정: 규칙 기반 자동 배정</li>
        <li>현장 운영: QR 체크인 기록 기반</li>
      </ul>
      <p style="margin-top: 5mm;">
        모든 과정은 시스템 로그로 관리되며, 감사 시 즉시 확인 가능합니다.
      </p>
    </div>
    <div class="footer">
      <p><strong>${data.associationName}</strong></p>
      <p>본 보고서는 ${data.generatedAt}에 생성되었습니다.</p>
      <p>생성자: ${data.generatedBy}${data.generatedByEmail ? ` (${data.generatedByEmail})` : ""}</p>
    </div>
  `;
}

/**
 * 구청 제출용 PDF HTML 생성 (최종)
 */
export function generateGovernmentPDFHTML(data: GovernmentPDFData): string {
  const sections = [
    STANDARD_HTML_HEADER,
    renderCoverPage(data),
    renderTournamentOverview(data),
    renderParticipantStatus(data),
    renderDrawResult(data),
    renderMatchSchedule(data),
    renderMatchResults(data),
    renderOnSiteOperations(data),
    renderOperationLogs(data),
    renderConclusion(data),
    `</body></html>`,
  ];
  
  return sections.join("\n");
}

