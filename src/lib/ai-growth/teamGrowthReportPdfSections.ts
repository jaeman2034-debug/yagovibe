import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type {
  TeamCoachRecommendation,
  TeamGrowthAiSummary,
  TeamGrowthSnapshot,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";
import type { TeamGrowthSummary } from "@/lib/ai-growth/teamGrowthSummaryTypes";
import type { CoachGrowthAiSummarySections } from "@/lib/ai-growth/growthAiSummaryTypes";
import { buildTeamWeeklyDigestPdfSection } from "@/lib/ai-growth/teamWeeklyDigestPdfSection";
import type { TeamWeeklyDigest } from "@/lib/ai-growth/teamWeeklyDigestTypes";

function listSection(title: string, items: string[]): string {
  if (items.length === 0) return "";
  const lis = items
    .map(
      (item) =>
        `<li style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#1e293b;">${escapeHtmlForPdf(item)}</li>`
    )
    .join("");
  return `
    <div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:8px;">${escapeHtmlForPdf(title)}</div>
    <ul style="margin:0;padding-left:18px;">${lis}</ul>`;
}

function coachSectionsHtml(coach: CoachGrowthAiSummarySections): string {
  const parts = [
    listSection("강점", coach.strengths),
    listSection("약점", coach.weaknesses),
    listSection("위험", coach.risks),
    listSection("권장 훈련", coach.recommendedTraining),
  ].filter(Boolean);
  return parts.join('<div style="margin-top:12px;"></div>');
}

/** Sprint E-1.4 — 팀 스냅샷 PDF 블록 */
export function buildTeamSnapshotPdfSection(
  snapshot: TeamGrowthSnapshot,
  riskPlayerCount: number
): string {
  if (snapshot.trackedCount === 0) return "";

  return pdfSection(`
    <div style="padding:18px 20px;background:#f0f9ff;border-radius:12px;border:2px solid #7dd3fc;">
      <div style="font-size:13px;font-weight:900;color:#0c4a6e;margin-bottom:12px;">팀 성장 스냅샷</div>
      <div style="font-size:14px;line-height:1.8;color:#0c4a6e;">
        <div><strong>추적 선수</strong> ${snapshot.trackedCount} / ${snapshot.rosterCount}</div>
        <div><strong>평균 OVR</strong> ${snapshot.avgOvr} · <strong>Level</strong> ${snapshot.avgLevel}</div>
        <div><strong>위험 선수</strong> ${riskPlayerCount}명</div>
      </div>
    </div>`);
}

/** Sprint E-1.4 — 위험 선수 PDF 블록 */
export function buildTeamAtRiskPlayersPdfSection(
  atRiskPlayers: TeamPlayerGrowthRow[]
): string {
  if (atRiskPlayers.length === 0) return "";

  const rows = atRiskPlayers
    .map((p) => {
      const risks = p.risks.map((r) => r.title).join(", ");
      return `<div style="margin-bottom:10px;padding:12px 14px;background:#fffbeb;border-radius:8px;border:1px solid #fcd34d;">
        <div style="font-size:14px;font-weight:800;color:#92400e;">${escapeHtmlForPdf(p.playerName)} · OVR ${p.avatar.ovr} · Lv.${p.avatar.level}</div>
        <div style="font-size:13px;color:#b45309;margin-top:4px;">${escapeHtmlForPdf(risks)}</div>
      </div>`;
    })
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#fffbeb;border-radius:12px;border:2px solid #fcd34d;">
      <div style="font-size:13px;font-weight:900;color:#92400e;margin-bottom:12px;">우선 점검 선수</div>
      ${rows}
    </div>`);
}

/** Sprint E-1.4 — 코치 권장 훈련 PDF 블록 */
export function buildTeamCoachRecommendationsPdfSection(
  recommendations: TeamCoachRecommendation[]
): string {
  const actionable = recommendations.filter((r) => r.id !== "team-maintain-momentum");
  if (actionable.length === 0) return "";

  const rows = actionable
    .map(
      (r) =>
        `<div style="margin-bottom:10px;padding:12px 14px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
          <div style="font-size:14px;font-weight:800;color:#0c4a6e;">${escapeHtmlForPdf(r.title)}</div>
          <div style="font-size:13px;color:#0369a1;margin-top:4px;">${escapeHtmlForPdf(r.detail)}</div>
          ${
            r.affectedPlayerNames.length > 0
              ? `<div style="font-size:12px;color:#0284c7;margin-top:4px;">대상: ${escapeHtmlForPdf(r.affectedPlayerNames.join(", "))}</div>`
              : ""
          }
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#e0f2fe;border-radius:12px;border:2px solid #7dd3fc;">
      <div style="font-size:13px;font-weight:900;color:#0c4a6e;margin-bottom:12px;">코치 권장 훈련</div>
      ${rows}
    </div>`);
}

/** Sprint E-1.4 — 선수별 코치 AI 요약 PDF 블록 */
export function buildTeamPlayerCoachSummariesPdfSection(
  teamSummary: TeamGrowthSummary | null | undefined
): string {
  if (!teamSummary?.playerSummaries.length) return "";

  const blocks = teamSummary.playerSummaries
    .map(
      (p) => `
      <div style="margin-bottom:14px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
        <div style="font-size:14px;font-weight:900;color:#0f172a;margin-bottom:10px;">
          ${escapeHtmlForPdf(p.playerName)} · OVR ${p.ovr} · Lv.${p.level}
        </div>
        ${coachSectionsHtml(p.coach)}
      </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#f8fafc;border-radius:12px;border:2px solid #cbd5e1;">
      <div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:12px;">선수별 코치 AI 요약</div>
      ${blocks}
    </div>`);
}

/** Sprint E-1.4 — 통합 팀 브리핑 PDF 블록 */
export function buildTeamBriefingPdfSection(
  teamSummary: TeamGrowthSummary | null | undefined,
  aiSummary: TeamGrowthAiSummary | null | undefined
): string {
  const paragraphs = [
    ...(teamSummary?.closingParagraphs ?? []),
    ...(aiSummary?.paragraphs ?? []),
  ].filter((p, i, arr) => arr.indexOf(p) === i);

  if (paragraphs.length === 0) return "";

  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#312e81;">${escapeHtmlForPdf(p)}</p>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:20px 22px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;">
      <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:12px;">통합 팀 브리핑</div>
      ${body}
    </div>`);
}

export type TeamGrowthReportPdfSectionsInput = {
  snapshot: TeamGrowthSnapshot;
  weeklyDigest: TeamWeeklyDigest | null;
  atRiskPlayers: TeamPlayerGrowthRow[];
  coachRecommendations: TeamCoachRecommendation[];
  teamSummary: TeamGrowthSummary | null;
  aiSummary: TeamGrowthAiSummary;
};

/** Sprint E-1.4 — 팀 PDF 섹션 조립 (E-1.2 weekly + E-1.3 summary 재사용) */
export function buildTeamGrowthReportPdfSections(input: TeamGrowthReportPdfSectionsInput): string {
  return [
    buildTeamSnapshotPdfSection(input.snapshot, input.atRiskPlayers.length),
    buildTeamWeeklyDigestPdfSection(input.weeklyDigest),
    buildTeamAtRiskPlayersPdfSection(input.atRiskPlayers),
    buildTeamCoachRecommendationsPdfSection(input.coachRecommendations),
    buildTeamPlayerCoachSummariesPdfSection(input.teamSummary),
    buildTeamBriefingPdfSection(input.teamSummary, input.aiSummary),
  ]
    .filter(Boolean)
    .join("");
}
