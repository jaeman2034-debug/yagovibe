import { buildRecentSessionTrendPdfSection } from "@/lib/ai-growth/growthTimelinePdfSection";
import {
  escapeHtmlForPdf,
  PDF_CONTENT_WIDTH_PX,
  pdfSection,
  renderHtmlToPdf,
} from "@/lib/ai-growth/renderHtmlToPdf";
import { buildGrowthReportLegalFooterHtml } from "@/lib/legal/growthReportPdfFooterHtml";
import { buildWeeklyGrowthDigestPdfSection } from "@/lib/ai-growth/weeklyGrowthDigestPdfSection";
import { buildGrowthAiSummaryPdfSection } from "@/lib/ai-growth/growthAiSummaryPdfSection";
import {
  assertSeasonReportExportable,
  type SeasonGrowthReport,
} from "@/lib/ai-growth/seasonGrowthReport";

const PDF_ROOT_ID = "yago-season-growth-pdf-root";

function formatReportDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildSeasonGrowthReportPdfFilename(
  playerName: string,
  seasonId: string
): string {
  const safe = (playerName.trim() || "선수").replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}_시즌성장리포트_${seasonId}.pdf`;
}

function buildKpiGrid(report: SeasonGrowthReport): string {
  const k = report.kpi;
  const cells = [
    { label: "총 검증 세션", value: `${k.totalSessions}회` },
    { label: "평균 Growth Score", value: `${k.avgGrowthScore}` },
    { label: "최고 Score", value: `${k.maxScore}` },
    { label: "최저 Score", value: `${k.minScore}` },
    { label: "코치 검증 이벤트", value: `${k.totalVerifiedEvents}건` },
    { label: "승인율", value: `${k.approvalRatePct}%` },
  ];

  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px;">
      ${cells
        .map(
          (c) => `
        <div style="padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;text-align:center;">
          <div style="font-size:10px;color:#64748b;font-weight:600;">${escapeHtmlForPdf(c.label)}</div>
          <div style="font-size:20px;font-weight:900;color:#0f172a;margin-top:6px;">${escapeHtmlForPdf(c.value)}</div>
        </div>`
        )
        .join("")}
    </div>`;
}

function buildCurve(report: SeasonGrowthReport): string {
  if (!report.timeline.points.length) {
    return `<p style="font-size:13px;color:#64748b;">시즌 내 월별 저장 데이터가 없습니다.</p>`;
  }

  return report.timeline.points
    .map((p) => {
      const h = Math.max(24, Math.round((p.overall / 100) * 90));
      return `
        <div style="flex:1;min-width:56px;text-align:center;">
          <div style="height:100px;display:flex;align-items:flex-end;justify-content:center;">
            <div style="width:32px;height:${h}px;background:linear-gradient(180deg,#6366f1,#4338ca);border-radius:6px 6px 0 0;"></div>
          </div>
          <div style="font-size:18px;font-weight:900;color:#312e81;margin-top:6px;">${p.overall}</div>
          <div style="font-size:11px;color:#64748b;">${escapeHtmlForPdf(p.label)}</div>
        </div>`;
    })
    .join("");
}

function buildMvpSection(report: SeasonGrowthReport): string {
  if (!report.dimensionMvps.length) {
    return `<p style="font-size:13px;color:#64748b;">축별 시즌 비교를 위해 더 많은 월간 데이터가 필요합니다.</p>`;
  }

  return report.dimensionMvps
    .map(
      (m) => `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:22px;">${m.medal}</span>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;">${escapeHtmlForPdf(m.label)}</div>
          <div style="font-size:12px;color:#64748b;">${escapeHtmlForPdf(m.labelKo)} · ${m.firstScore} → ${m.lastScore}</div>
        </div>
        <div style="font-size:18px;font-weight:900;color:#4f46e5;">+${m.delta}</div>
      </div>`
    )
    .join("");
}

function buildSeasonReportHtml(report: SeasonGrowthReport): string {
  const name = escapeHtmlForPdf(report.playerName);
  const team = report.teamName ? escapeHtmlForPdf(report.teamName) : "";
  const date = formatReportDate(report.generatedAt);

  const scoreArc =
    report.firstOverall !== null && report.lastOverall !== null
      ? `<div style="margin-top:16px;font-size:32px;font-weight:900;">
          ${report.firstOverall}
          <span style="font-size:18px;color:rgba(255,255,255,0.7);"> → </span>
          ${report.lastOverall}
        </div>`
      : "";

  const spanBadge =
    report.spanDelta !== null
      ? `<div style="margin-top:12px;display:inline-block;padding:8px 18px;background:rgba(255,255,255,0.2);border-radius:999px;font-size:16px;font-weight:800;">
          ${report.spanDelta > 0 ? "+" : ""}${report.spanDelta} 성장
        </div>`
      : "";

  const coachHtml = report.coachSeasonReview
    .map(
      (p) =>
        `<p style="font-size:14px;line-height:1.7;margin:12px 0;color:#334155;">${escapeHtmlForPdf(p)}</p>`
    )
    .join("");

  const goalsHtml = report.nextSeasonGoals
    .map(
      (g) => `
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e0e7ff;">
        <span style="font-weight:600;color:#334155;">${escapeHtmlForPdf(g.label)}</span>
        <strong style="font-size:17px;color:#4338ca;">${g.target}</strong>
      </div>`
    )
    .join("");

  const ovrHtml = report.ovrImpact
    ? `
    <div style="margin-top:16px;padding:14px;background:#fef3c7;border-radius:10px;border:1px solid #fcd34d;">
      <div style="font-size:12px;font-weight:700;color:#92400e;">시즌 OVR 반영 (Growth Score 연동)</div>
      <div style="font-size:22px;font-weight:900;color:#78350f;margin-top:6px;">
        OVR ${report.ovrImpact.before.ovr} → ${report.ovrImpact.after.ovr}
        <span style="font-size:14px;color:#b45309;margin-left:8px;">
          ${report.ovrImpact.ovrDelta > 0 ? "+" : ""}${report.ovrImpact.ovrDelta}
        </span>
      </div>
      ${report.ovrImpact.statChanges
        .map(
          (c) =>
            `<p style="font-size:12px;color:#78350f;margin:6px 0;">${escapeHtmlForPdf(c.label)} ${c.from} → ${c.to} (${c.delta > 0 ? "+" : ""}${c.delta})</p>`
        )
        .join("")}
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#0f172a;background:#fff;">
  <div id="${PDF_ROOT_ID}" style="width:${PDF_CONTENT_WIDTH_PX}px;padding:32px 28px;box-sizing:border-box;margin:0 auto;">
    ${pdfSection(`
    <div style="padding:32px 28px;background:linear-gradient(135deg,#4338ca 0%,#6366f1 50%,#7c3aed 100%);border-radius:16px;color:#fff;text-align:center;">
      <div style="font-size:11px;letter-spacing:3px;opacity:0.9;">YAGO SEASON GROWTH REPORT</div>
      <div style="font-size:26px;font-weight:900;margin:12px 0 4px;">${name}</div>
      <div style="font-size:14px;opacity:0.95;">시즌 · ${escapeHtmlForPdf(report.season.label)}</div>
      ${scoreArc}
      ${spanBadge}
    </div>
    <p style="margin-top:8px;font-size:11px;color:#64748b;">발행 ${date}${team ? ` · ${team}` : ""}</p>
    `)}

    ${buildGrowthAiSummaryPdfSection(report.aiGrowthSummary)}

    ${buildWeeklyGrowthDigestPdfSection(report.weeklyGrowthDigest)}

    ${buildRecentSessionTrendPdfSection(report.recentSessionTimeline)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 8px;">시즌 요약 KPI</h2>
    ${buildKpiGrid(report)}
    `)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 8px;">성장 곡선</h2>
    <div style="display:flex;gap:8px;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
      ${buildCurve(report)}
    </div>
    `)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 8px;">시즌 MVP 능력</h2>
    <div style="padding:8px 16px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
      ${buildMvpSection(report)}
    </div>
    `)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 8px;">코치 시즌 총평</h2>
    <div style="padding:16px 20px;background:#fafafa;border-radius:12px;border:1px solid #e2e8f0;">
      ${coachHtml}
    </div>
    `)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 8px;">다음 시즌 목표</h2>
    <div style="padding:16px 20px;background:#eef2ff;border-radius:12px;border:1px solid #c7d2fe;">
      ${goalsHtml}
      <p style="margin-top:12px;font-size:13px;font-weight:700;color:#4338ca;">다음 시즌 OVR 목표: 현재 +4 (코치 검증 누적 시)</p>
    </div>
    ${ovrHtml}
    `)}

    ${pdfSection(`
    <div style="padding-top:14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;">
      코치가 영상으로 확인·승인한 내용만 포함됩니다. · YAGO VIBE Sports
    </div>
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;line-height:1.55;">
      ${buildGrowthReportLegalFooterHtml(report.generatedAt)}
    </div>
    `)}
  </div>
</body>
</html>`;
}

export async function exportSeasonGrowthReportPdf(report: SeasonGrowthReport): Promise<string> {
  assertSeasonReportExportable(report);
  const filename = buildSeasonGrowthReportPdfFilename(report.playerName, report.season.id);
  return renderHtmlToPdf(buildSeasonReportHtml(report), filename, PDF_ROOT_ID);
}
