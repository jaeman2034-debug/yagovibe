import {
  assertMonthlyReportExportable,
  type MonthlyGrowthReport,
} from "@/lib/ai-growth/monthlyGrowthReport";
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

const PDF_ROOT_ID = "yago-monthly-growth-pdf-root";

function formatReportDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildMonthlyGrowthReportPdfFilename(
  playerName: string,
  generatedAt: number
): string {
  const safe = (playerName.trim() || "선수").replace(/[\\/:*?"<>|]/g, "_");
  const d = new Date(generatedAt);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${safe}_월간성장리포트_${ym}.pdf`;
}

function buildTrendBars(report: MonthlyGrowthReport): string {
  return report.timeline.points
    .map((p) => {
      const h = Math.max(28, Math.round((p.overall / 100) * 100));
      return `
        <div style="flex:1;min-width:64px;text-align:center;">
          <div style="height:110px;display:flex;align-items:flex-end;justify-content:center;">
            <div style="width:40px;height:${h}px;background:linear-gradient(180deg,#10b981,#047857);border-radius:8px 8px 0 0;"></div>
          </div>
          <div style="font-size:22px;font-weight:900;color:#064e3b;margin-top:8px;">${p.overall}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtmlForPdf(p.label)}</div>
        </div>`;
    })
    .join("");
}

function buildTopDimensionSection(report: MonthlyGrowthReport): string {
  const dim = report.topDimension;
  if (!dim) {
    return `<p style="font-size:13px;color:#64748b;">축별 점수 비교를 위해 더 많은 월간 세션이 필요합니다.</p>`;
  }

  const sign = dim.delta > 0 ? "+" : "";
  return `
    <div style="padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #86efac;">
      <div style="font-size:12px;font-weight:700;color:#047857;">가장 많이 성장한 항목</div>
      <div style="font-size:20px;font-weight:900;color:#14532d;margin-top:8px;">${escapeHtmlForPdf(dim.label)}</div>
      <div style="font-size:13px;color:#166534;margin-top:4px;">${escapeHtmlForPdf(dim.labelKo)}</div>
      <div style="margin-top:16px;font-size:28px;font-weight:900;color:#064e3b;">
        ${dim.firstScore}
        <span style="font-size:16px;color:#64748b;font-weight:600;"> → </span>
        ${dim.lastScore}
        <span style="font-size:14px;color:#059669;margin-left:8px;">${sign}${dim.delta}</span>
      </div>
    </div>`;
}

function buildGoalsSection(report: MonthlyGrowthReport): string {
  const rows = report.nextMonthGoals
    .map((g) => {
      const current =
        g.current !== null
          ? `<span style="color:#64748b;font-size:12px;">현재 ${g.current}점 · </span>`
          : `<span style="color:#94a3b8;font-size:12px;">관찰 데이터 없음 · </span>`;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:14px;font-weight:600;color:#334155;">${escapeHtmlForPdf(g.label)}</span>
          <span>${current}<strong style="font-size:18px;color:#4f46e5;">목표 ${g.target}</strong></span>
        </div>`;
    })
    .join("");

  return `
    <h2 style="font-size:15px;margin:0 0 12px;color:#0f172a;">다음 달 목표</h2>
    <div style="padding:16px 20px;background:#eef2ff;border-radius:12px;border:1px solid #c7d2fe;">
      ${rows}
    </div>`;
}

function buildMonthlyReportHtml(report: MonthlyGrowthReport): string {
  const name = escapeHtmlForPdf(report.playerName);
  const team = report.teamName ? escapeHtmlForPdf(report.teamName) : "";
  const date = formatReportDate(report.generatedAt);
  const span = report.timeline.spanDelta;
  const spanHtml =
    span !== null
      ? `<div style="margin-top:12px;display:inline-block;padding:10px 20px;background:rgba(255,255,255,0.2);border-radius:999px;font-size:18px;font-weight:900;">
          ${span > 0 ? "+" : ""}${span} 성장
        </div>`
      : "";

  const coachHtml = report.coachComments
    .map((p) => `<p style="font-size:14px;line-height:1.65;margin:10px 0;color:#334155;">${escapeHtmlForPdf(p)}</p>`)
    .join("");

  const latest =
    report.latestOverall !== null
      ? `<div style="font-size:13px;opacity:0.9;margin-top:6px;">최근 세션 ${report.latestOverall}점</div>`
      : "";

  const narrativeHtml = report.timeline.parentNarrative
    ? `<p style="margin-top:10px;font-size:13px;font-weight:600;color:#047857;">${escapeHtmlForPdf(report.timeline.parentNarrative)}</p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#0f172a;background:#fff;">
  <div id="${PDF_ROOT_ID}" style="width:${PDF_CONTENT_WIDTH_PX}px;padding:32px 28px;box-sizing:border-box;margin:0 auto;">
    ${pdfSection(`
    <div style="padding:32px 28px;background:linear-gradient(135deg,#059669 0%,#047857 50%,#065f46 100%);border-radius:16px;color:#fff;text-align:center;">
      <div style="font-size:11px;letter-spacing:3px;opacity:0.9;">YAGO MONTHLY GROWTH REPORT</div>
      <div style="font-size:28px;font-weight:900;margin:14px 0 6px;">${name}</div>
      <div style="font-size:14px;opacity:0.95;">월간 성장 리포트 · ${escapeHtmlForPdf(report.periodLabel)}</div>
      ${latest}
      ${spanHtml}
    </div>
    <div style="margin-top:8px;font-size:11px;color:#64748b;">
      발행 ${date}${team ? ` · ${team}` : ""} · 검증 세션 ${report.totalSessions}회 · 검증 이벤트 ${report.totalVerifiedEvents}건
    </div>
    `)}

    ${buildGrowthAiSummaryPdfSection(report.aiGrowthSummary)}

    ${buildWeeklyGrowthDigestPdfSection(report.weeklyGrowthDigest)}

    ${buildRecentSessionTrendPdfSection(report.recentSessionTimeline)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a;">Growth Score 추이</h2>
    <div style="display:flex;gap:10px;align-items:flex-end;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
      ${buildTrendBars(report)}
    </div>
    ${narrativeHtml}
    `)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a;">성장 항목 분석</h2>
    ${buildTopDimensionSection(report)}
    `)}

    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a;">코치 코멘트</h2>
    <div style="padding:18px 20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
      ${coachHtml}
    </div>
    `)}

    ${pdfSection(buildGoalsSection(report))}

    ${pdfSection(`
    <div style="padding-top:14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;line-height:1.5;">
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

export async function exportMonthlyGrowthReportPdf(report: MonthlyGrowthReport): Promise<string> {
  assertMonthlyReportExportable(report);
  const filename = buildMonthlyGrowthReportPdfFilename(report.playerName, report.generatedAt);
  const html = buildMonthlyReportHtml(report);
  return renderHtmlToPdf(html, filename, PDF_ROOT_ID);
}
