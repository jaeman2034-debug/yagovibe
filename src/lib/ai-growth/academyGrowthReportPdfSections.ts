import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type { AcademyCoachPerformanceResult } from "@/lib/ai-growth/academyCoachPerformanceTypes";
import type { AcademyDashboardResult } from "@/lib/ai-growth/academyDashboardTypes";
import type { AcademyWeeklyDigest } from "@/lib/ai-growth/academyWeeklyDigestTypes";
import {
  buildTeamAtRiskPlayersPdfSection,
  buildTeamCoachRecommendationsPdfSection,
} from "@/lib/ai-growth/teamGrowthReportPdfSections";
import type {
  TeamCoachRecommendation,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** Sprint F-1.4 — 아카데미 대시보드 PDF 블록 */
export function buildAcademyDashboardPdfSection(
  dashboard: AcademyDashboardResult | null | undefined
): string {
  if (!dashboard) return "";
  const s = dashboard.snapshot;

  return pdfSection(`
    <div style="padding:18px 20px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;">
      <div style="font-size:13px;font-weight:900;color:#5b21b6;margin-bottom:4px;">아카데미 대시보드</div>
      <div style="font-size:18px;font-weight:900;color:#4c1d95;margin-bottom:6px;">${escapeHtmlForPdf(dashboard.headline)}</div>
      ${
        dashboard.subline
          ? `<div style="font-size:12px;color:#6d28d9;margin-bottom:10px;">${escapeHtmlForPdf(dashboard.subline)}</div>`
          : ""
      }
      <div style="font-size:14px;line-height:1.8;color:#4c1d95;">
        <div><strong>총 선수</strong> ${s.totalPlayers} · <strong>총 팀</strong> ${s.teamCount}</div>
        <div><strong>평균 OVR</strong> ${s.trackedPlayers > 0 ? s.avgOvr : "—"} · <strong>Level</strong> ${s.trackedPlayers > 0 ? s.avgLevel : "—"}</div>
        <div><strong>위험 선수</strong> ${s.atRiskCount}명 · <strong>활성 보호자</strong> ${s.activeGuardianCount}명</div>
      </div>
    </div>`);
}

/** Sprint F-1.4 — 아카데미 주간 요약 PDF 블록 */
export function buildAcademyWeeklyDigestPdfSection(
  digest: AcademyWeeklyDigest | null | undefined
): string {
  if (!digest || digest.trackedPlayers === 0) return "";

  const rows: string[] = [
    `<div style="margin-bottom:8px;"><strong>추적 선수</strong> ${digest.trackedPlayers}/${digest.rosterCount}</div>`,
    `<div style="margin-bottom:8px;"><strong>평균 OVR</strong> ${digest.avgOvr}${
      digest.avgOvrDelta !== null ? ` (${formatSignedDelta(digest.avgOvrDelta)})` : ""
    } · <strong>Level</strong> ${digest.avgLevel}</div>`,
  ];

  if (digest.riskPlayerCount > 0) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>위험 선수</strong> ${digest.riskPlayerCount}명</div>`
    );
  }

  if (digest.newBadges.length > 0) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>신규 배지</strong> ${escapeHtmlForPdf(digest.newBadges.join(", "))}</div>`
    );
  }

  if (digest.focusTraining) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>집중 훈련</strong> ${escapeHtmlForPdf(digest.focusTraining)}</div>`
    );
  }

  const summaryHtml = digest.summary.paragraphs
    .map((paragraph) => `<p style="margin:0 0 8px;">${escapeHtmlForPdf(paragraph)}</p>`)
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#fdf4ff;border-radius:12px;border:2px solid #f0abfc;">
      <div style="font-size:13px;font-weight:900;color:#86198f;margin-bottom:4px;">이번 주 아카데미 성장 요약</div>
      <div style="font-size:11px;color:#a21caf;margin-bottom:10px;">${escapeHtmlForPdf(digest.weekLabel)}</div>
      <div style="font-size:14px;line-height:1.65;color:#701a75;">${rows.join("")}</div>
      ${
        summaryHtml
          ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #f5d0fe;font-size:13px;line-height:1.65;color:#701a75;">${summaryHtml}</div>`
          : ""
      }
    </div>`);
}

/** Sprint F-1.4 — 코치 성과 PDF 블록 */
export function buildAcademyCoachPerformancePdfSection(
  performance: AcademyCoachPerformanceResult | null | undefined
): string {
  if (!performance) return "";

  const kpi = performance.kpi;
  const coachRows = performance.coaches
    .map(
      (coach) =>
        `<div style="margin-bottom:10px;padding:12px 14px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
          <div style="font-size:14px;font-weight:800;color:#065f46;">${escapeHtmlForPdf(coach.coachLabel)}</div>
          <div style="font-size:13px;color:#047857;margin-top:4px;line-height:1.6;">
            담당 ${coach.playerCount}명 · OVR ${coach.avgOvr} · 성장률 ${
              coach.avgGrowthRate !== null ? formatSignedDelta(coach.avgGrowthRate) : "—"
            } · 위험 ${coach.atRiskCount}명 · 관리율 ${coach.riskManagementRate}%
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#ecfdf5;border-radius:12px;border:2px solid #6ee7b7;">
      <div style="font-size:13px;font-weight:900;color:#065f46;margin-bottom:12px;">코치 성과</div>
      <div style="font-size:14px;line-height:1.8;color:#047857;margin-bottom:12px;">
        <div><strong>담당 선수</strong> ${kpi.playerCount} · <strong>평균 OVR</strong> ${kpi.avgOvr}</div>
        <div><strong>평균 성장률</strong> ${
          kpi.avgGrowthRate !== null ? formatSignedDelta(kpi.avgGrowthRate) : "—"
        } · <strong>위험 관리율</strong> ${kpi.riskManagementRate}% · <strong>배지</strong> ${kpi.badgeCount}</div>
      </div>
      <div style="margin-bottom:12px;padding-top:12px;border-top:1px solid #a7f3d0;">
        <div style="font-size:12px;font-weight:800;color:#065f46;margin-bottom:8px;">코칭 Impact</div>
        <div style="font-size:13px;line-height:1.7;color:#047857;">
          Recovery 위험 ${performance.impact.recoveryRiskCount}명 · 성장 하락 ${performance.impact.declineCount}명 · 집중 관리 ${performance.impact.needsFocusCount}명
        </div>
      </div>
      ${coachRows}
    </div>`);
}

/** Sprint F-1.4 — 위험 선수 현황 (E-1.4 블록 재사용, 제목만 아카데미용) */
export function buildAcademyAtRiskPlayersPdfSection(
  atRiskPlayers: TeamPlayerGrowthRow[]
): string {
  const inner = buildTeamAtRiskPlayersPdfSection(atRiskPlayers);
  if (!inner) return "";
  return inner.replace("우선 점검 선수", "위험 선수 현황");
}

/** Sprint F-1.4 — AI 아카데미 요약 PDF 블록 */
export function buildAcademyAiSummaryPdfSection(input: {
  weeklyDigest: AcademyWeeklyDigest | null | undefined;
  coachPerformance: AcademyCoachPerformanceResult | null | undefined;
}): string {
  const paragraphs = [
    ...(input.weeklyDigest?.summary.paragraphs ?? []),
    ...(input.coachPerformance?.summary.paragraphs ?? []),
  ].filter((paragraph, index, arr) => arr.indexOf(paragraph) === index);

  if (paragraphs.length === 0) return "";

  const body = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#312e81;">${escapeHtmlForPdf(paragraph)}</p>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:20px 22px;background:#ede9fe;border-radius:12px;border:2px solid #a78bfa;">
      <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:12px;">AI 아카데미 요약</div>
      ${body}
    </div>`);
}

export type AcademyGrowthReportPdfSectionsInput = {
  academyDashboard: AcademyDashboardResult | null;
  academyWeeklyDigest: AcademyWeeklyDigest | null;
  academyCoachPerformance: AcademyCoachPerformanceResult | null;
  atRiskPlayers: TeamPlayerGrowthRow[];
  coachRecommendations: TeamCoachRecommendation[];
};

/** Sprint F-1.4 — 아카데미 PDF 섹션 조립 */
export function buildAcademyGrowthReportPdfSections(
  input: AcademyGrowthReportPdfSectionsInput
): string {
  return [
    buildAcademyDashboardPdfSection(input.academyDashboard),
    buildAcademyWeeklyDigestPdfSection(input.academyWeeklyDigest),
    buildAcademyCoachPerformancePdfSection(input.academyCoachPerformance),
    buildAcademyAtRiskPlayersPdfSection(input.atRiskPlayers),
    buildTeamCoachRecommendationsPdfSection(input.coachRecommendations),
    buildAcademyAiSummaryPdfSection({
      weeklyDigest: input.academyWeeklyDigest,
      coachPerformance: input.academyCoachPerformance,
    }),
  ]
    .filter(Boolean)
    .join("");
}
