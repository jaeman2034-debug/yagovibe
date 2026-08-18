import {
  buildSparklinePolylinePoints,
  canShowGrowthTimelineChart,
  formatGrowthTimelineScoreChain,
  formatGrowthTrendDeltaLabel,
} from "@/lib/ai-growth/growthTimelineDisplay";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";

function trendDeltaColor(direction: PlayerGrowthTimeline["trendDirection"]): string {
  if (direction === "up") return "#047857";
  if (direction === "down") return "#b45309";
  return "#6d28d9";
}

/** D-4.2-d — PDF 공통: 최근 5회 세션 OVR (월간·시즌 리포트) */
export function buildRecentSessionTrendPdfSection(
  timeline: PlayerGrowthTimeline | null | undefined
): string {
  if (!canShowGrowthTimelineChart(timeline ?? null)) {
    return pdfSection(`
    <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a;">최근 5회 OVR 추세</h2>
    <p style="font-size:13px;color:#64748b;padding:12px 16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
      저장된 훈련 기록이 2회 이상이면 최근 5회 OVR 추세가 표시됩니다.
    </p>`);
  }

  const t = timeline!;
  const scores = t.points.map((p) => p.score);
  const sparkline = buildSparklinePolylinePoints(scores);
  const scoreChain = formatGrowthTimelineScoreChain(scores);
  const deltaLabel = formatGrowthTrendDeltaLabel(t.deltaScore, t.trendDirection);
  const deltaColor = trendDeltaColor(t.trendDirection);

  const bars = t.points
    .map((p) => {
      const h = Math.max(28, Math.round((p.score / 100) * 100));
      return `
        <div style="flex:1;min-width:52px;text-align:center;">
          <div style="height:100px;display:flex;align-items:flex-end;justify-content:center;">
            <div style="width:32px;height:${h}px;background:linear-gradient(180deg,#8b5cf6,#6d28d9);border-radius:8px 8px 0 0;"></div>
          </div>
          <div style="font-size:20px;font-weight:900;color:#4c1d95;margin-top:8px;">${p.score}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtmlForPdf(p.sessionDate.slice(5))}</div>
        </div>`;
    })
    .join("");

  const sparklineHtml = sparkline
    ? `<svg viewBox="0 0 100 24" width="100%" height="32" preserveAspectRatio="none" style="display:block;margin-top:12px;">
        <polyline points="${sparkline}" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>`
    : "";

  return pdfSection(`
    <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a;">최근 5회 OVR 추세</h2>
    <div style="padding:16px;background:#faf5ff;border-radius:12px;border:1px solid #ddd6fe;">
      <div style="display:flex;gap:8px;align-items:flex-end;">
        ${bars}
      </div>
      ${sparklineHtml}
      <p style="margin:14px 0 0;font-size:15px;font-weight:700;color:#1e293b;letter-spacing:0.02em;">${escapeHtmlForPdf(scoreChain)}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#475569;">
        변화 <strong style="color:${deltaColor};font-size:14px;">${escapeHtmlForPdf(deltaLabel)}</strong>
      </p>
    </div>`);
}
