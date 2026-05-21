/**
 * 🔥 코치 리포트 서비스
 * 
 * 역할:
 * - 경기 전 자동 리포트 생성
 * - 팀 상태 요약
 * - 위험 선수 표시
 * - 코치 권장사항 제공
 * 
 * UX 목적:
 * - 코치에게 가치 전달
 * - 앱을 "도구"로 인정받기
 */

import type { CoachDashboard } from "./coachDashboardService";
import type { PlayerStatus } from "./coachDashboardService";

/**
 * 🔥 리포트 타입
 */
export type ReportType = "pre_match" | "weekly" | "monthly";

/**
 * 🔥 코치 리포트 데이터
 */
export interface CoachReport {
  type: ReportType;
  teamName: string;
  generatedAt: Date;
  summary: {
    totalPlayers: number;
    averageRhythm: number | null;
    overloadPlayers: number; // 과부하 선수 수
    recoveryPlayers: number; // 회복 필요 선수 수
  };
  riskPlayers: PlayerStatus[]; // 위험 선수 (rhythm < 40 || loadRatio > 1.2)
  readyPlayers: PlayerStatus[]; // 컨디션 우수 선수 (rhythm >= 80)
  aiComment: string; // AI 코치 코멘트 (하단 한 줄)
}

/**
 * 🔥 AI 코치 코멘트 생성 (하단 한 줄)
 * 
 * @param dashboard 코치 대시보드 데이터
 * @returns AI 코치 코멘트
 */
function generateAIComment(dashboard: CoachDashboard): string {
  const { players, riskPlayers, teamAverage } = dashboard;

  const readyPlayers = players.filter(
    (p) => p.rhythmScore !== null && p.rhythmScore >= 80
  );
  const overloadPlayers = players.filter(
    (p) => p.trainingLoad.loadRatio > 1.2
  );
  const lowRhythmPlayers = players.filter(
    (p) => p.rhythmScore !== null && p.rhythmScore < 40
  );

  // 🔥 템플릿 기반 코멘트 생성
  if (riskPlayers.critical > 0) {
    return `팀 전반 컨디션은 안정적이나 위험 선수 ${riskPlayers.critical}명이 즉시 휴식이 필요합니다. 경기 전 회복 세션을 권장합니다.`;
  }

  if (overloadPlayers.length > 2) {
    return `부하 높은 선수가 많아 회복 세션 필요합니다. 경기 전 훈련 강도를 조절하세요.`;
  }

  if (lowRhythmPlayers.length > 3) {
    return `일부 선수의 컨디션이 낮습니다. 경기 전 휴식 시간을 확보하고 컨디션 우수 선수 ${readyPlayers.length}명을 최대한 활용하세요.`;
  }

  if (teamAverage.rhythmScore !== null && teamAverage.rhythmScore > 75) {
    return `팀 컨디션 양호, 정상 훈련 가능합니다. 컨디션 우수 선수 ${readyPlayers.length}명을 경기에서 최대한 활용하세요.`;
  }

  if (teamAverage.trainingLoad > 1.2) {
    return `팀 전체 훈련 부하가 높습니다. 경기 전 회복 훈련으로 전환을 권장합니다.`;
  }

  return `팀 전반 컨디션은 안정적입니다. 정상적인 경기 준비를 진행하세요.`;
}

/**
 * 🔥 경기 전 리포트 생성 (1페이지 MVP)
 * 
 * @param dashboard 코치 대시보드 데이터
 * @param teamName 팀 이름
 * @returns 코치 리포트
 */
export function generatePreMatchReport(
  dashboard: CoachDashboard,
  teamName: string
): CoachReport {
  const { players, totalPlayers, teamAverage } = dashboard;

  // 🔥 위험 선수 (rhythm < 40 || loadRatio > 1.2)
  const riskPlayers = players.filter(
    (p) =>
      (p.rhythmScore !== null && p.rhythmScore < 40) ||
      p.trainingLoad.loadRatio > 1.2
  );

  // 🔥 컨디션 우수 선수 (rhythm >= 80)
  const readyPlayers = players.filter(
    (p) => p.rhythmScore !== null && p.rhythmScore >= 80
  );

  // 🔥 과부하 선수 (loadRatio > 1.2)
  const overloadPlayers = players.filter(
    (p) => p.trainingLoad.loadRatio > 1.2
  );

  // 🔥 회복 필요 선수 (rhythm < 60 || loadRatio > 1.0)
  const recoveryPlayers = players.filter(
    (p) =>
      (p.rhythmScore !== null && p.rhythmScore < 60) ||
      p.trainingLoad.loadRatio > 1.0
  );

  // 🔥 AI 코치 코멘트 생성
  const aiComment = generateAIComment(dashboard);

  return {
    type: "pre_match",
    teamName,
    generatedAt: new Date(),
    summary: {
      totalPlayers,
      averageRhythm: teamAverage.rhythmScore,
      overloadPlayers: overloadPlayers.length,
      recoveryPlayers: recoveryPlayers.length,
    },
    riskPlayers,
    readyPlayers,
    aiComment,
  };
}

/**
 * 🔥 리포트를 텍스트 형식으로 변환 (1페이지 MVP)
 * 
 * @param report 코치 리포트
 * @returns 텍스트 형식 리포트
 */
export function formatReportAsText(report: CoachReport): string {
  const { teamName, generatedAt, summary, riskPlayers, readyPlayers, aiComment } = report;

  let text = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 ${teamName} 경기 전 리포트\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `생성일: ${generatedAt.toLocaleString("ko-KR")}\n\n`;

  // 🔥 ① 팀 요약
  text += `📈 팀 요약\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `팀 평균 리듬: ${summary.averageRhythm !== null ? Math.round(summary.averageRhythm) : "-"}점\n`;
  text += `과부하 선수: ${summary.overloadPlayers}명\n`;
  text += `회복 권장: ${summary.recoveryPlayers}명\n\n`;

  // 🔥 ② 위험 선수 리스트 (핵심)
  if (riskPlayers.length > 0) {
    text += `⚠️ 위험 선수 (${riskPlayers.length}명)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    riskPlayers.forEach((player) => {
      const reasons: string[] = [];
      if (player.rhythmScore !== null && player.rhythmScore < 40) {
        reasons.push(`리듬 ${Math.round(player.rhythmScore)}`);
      }
      if (player.trainingLoad.loadRatio > 1.2) {
        reasons.push(`부하 ${player.trainingLoad.loadRatio.toFixed(1)}x`);
      }
      text += `${player.name} — ${reasons.join(", ")}\n`;
    });
    text += `\n`;
  }

  // 🔥 ③ 컨디션 우수 선수
  if (readyPlayers.length > 0) {
    text += `✅ 컨디션 우수 선수 (${readyPlayers.length}명)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    readyPlayers.forEach((player) => {
      const status = player.rhythmScore! >= 85 ? "훈련 적기" : "집중 훈련 가능";
      text += `${player.name} — 리듬 ${Math.round(player.rhythmScore!)} (${status})\n`;
    });
    text += `\n`;
  }

  // 🔥 ④ AI 코치 코멘트 (하단 한 줄)
  text += `💡 AI 코치 코멘트\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `${aiComment}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `YAGO SPORTS - 선수 퍼포먼스 관리 플랫폼\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return text;
}

/**
 * 🔥 리포트를 HTML 형식으로 변환 (PDF 생성용, 1페이지 MVP)
 * 
 * @param report 코치 리포트
 * @returns HTML 형식 리포트
 */
export function formatReportAsHTML(report: CoachReport): string {
  const { teamName, generatedAt, summary, riskPlayers, readyPlayers, aiComment } = report;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
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
    .header .date {
      color: #666;
      font-size: 14px;
      margin-top: 8px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .player-list {
      margin-top: 16px;
    }
    .player-card {
      background: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .player-card.risk {
      border-left-color: #dc2626;
      background: #fef2f2;
    }
    .player-card.ready {
      border-left-color: #16a34a;
      background: #f0fdf4;
    }
    .player-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .player-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      font-size: 14px;
    }
    .stat-item {
      color: #666;
    }
    .stat-value {
      font-weight: bold;
      color: #333;
    }
    .recommendations {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 4px;
    }
    .recommendations ul {
      margin: 0;
      padding-left: 20px;
    }
    .recommendations li {
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${teamName} 경기 전 리포트</h1>
    <div class="date">생성일: ${generatedAt.toLocaleString("ko-KR")}</div>
  </div>

  <div class="section">
    <h2>📈 팀 요약</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">팀 평균 리듬</div>
        <div class="value">${summary.averageRhythm !== null ? Math.round(summary.averageRhythm) : "-"}점</div>
      </div>
      <div class="summary-card">
        <div class="label">과부하 선수</div>
        <div class="value">${summary.overloadPlayers}명</div>
      </div>
      <div class="summary-card">
        <div class="label">회복 권장</div>
        <div class="value">${summary.recoveryPlayers}명</div>
      </div>
    </div>
  </div>

  ${riskPlayers.length > 0 ? `
  <div class="section">
    <h2>⚠️ 위험 선수 (${riskPlayers.length}명)</h2>
    <div class="player-list">
      ${riskPlayers.map((player) => {
        const reasons: string[] = [];
        if (player.rhythmScore !== null && player.rhythmScore < 40) {
          reasons.push(`리듬 ${Math.round(player.rhythmScore)}`);
        }
        if (player.trainingLoad.loadRatio > 1.2) {
          reasons.push(`부하 ${player.trainingLoad.loadRatio.toFixed(1)}x`);
        }
        return `
        <div class="player-card risk">
          <div class="player-name">${player.name} — ${reasons.join(", ")}</div>
        </div>
      `;
      }).join("")}
    </div>
  </div>
  ` : ""}

  ${readyPlayers.length > 0 ? `
  <div class="section">
    <h2>✅ 준비 완료 선수 (${readyPlayers.length}명)</h2>
    <div class="player-list">
      ${readyPlayers.map((player) => {
        const status = player.rhythmScore! >= 85 ? "훈련 적기" : "집중 훈련 가능";
        return `
        <div class="player-card ready">
          <div class="player-name">${player.name} — 리듬 ${Math.round(player.rhythmScore!)} (${status})</div>
        </div>
      `;
      }).join("")}
    </div>
  </div>
  ` : ""}

  <div class="section">
    <h2>💡 AI 코치 코멘트</h2>
    <div class="recommendations">
      <p style="margin: 0; font-size: 14px; line-height: 1.6;">${aiComment}</p>
    </div>
  </div>

  <div class="footer">
    YAGO SPORTS - 선수 퍼포먼스 관리 플랫폼
  </div>
</body>
</html>
  `.trim();
}
