import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type { WeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyDigestTypes";
import { formatWeeklyOvrLine } from "@/lib/ai-growth/weeklyGrowthDigestEngine";

/** Sprint D-5.3-c — PDF 상단 주간 성장 요약 블록 */
export function buildWeeklyGrowthDigestPdfSection(
  growth: WeeklyGrowthDigestEnrichment | null | undefined
): string {
  if (!growth) return "";

  const ovrLine = formatWeeklyOvrLine(growth);
  const rows: string[] = [];

  if (ovrLine) {
    const delta =
      growth.ovrDelta !== null
        ? `<span style="margin-left:8px;font-size:13px;color:#059669;">${
            growth.ovrDelta > 0 ? "+" : ""
          }${growth.ovrDelta}</span>`
        : "";
    rows.push(
      `<div style="margin-bottom:8px;"><strong>OVR</strong> ${escapeHtmlForPdf(ovrLine)}${delta}</div>`
    );
  }

  if (growth.newBadges.length > 0) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>신규 배지</strong> ${escapeHtmlForPdf(growth.newBadges.join(", "))}</div>`
    );
  }

  if (growth.focusRecommendation) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>추천 훈련</strong> ${escapeHtmlForPdf(growth.focusRecommendation)}</div>`
    );
  }

  if (growth.nextGoal) {
    rows.push(
      `<div><strong>다음 목표</strong> ${escapeHtmlForPdf(growth.nextGoal)}</div>`
    );
  }

  if (rows.length === 0) return "";

  return pdfSection(`
    <div style="padding:18px 20px;background:#eef2ff;border-radius:12px;border:2px solid #a5b4fc;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:900;color:#312e81;margin-bottom:10px;">이번 주 성장 요약</div>
      <div style="font-size:14px;line-height:1.65;color:#1e1b4b;">${rows.join("")}</div>
    </div>`);
}
