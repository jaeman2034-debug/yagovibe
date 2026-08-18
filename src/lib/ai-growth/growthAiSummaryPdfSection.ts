import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type { GrowthAiSummaryResult } from "@/lib/ai-growth/growthAiSummaryTypes";

/** Sprint D-5.5-d — PDF 상단 AI 성장 요약 블록 */
export function buildGrowthAiSummaryPdfSection(
  summary: GrowthAiSummaryResult | null | undefined
): string {
  if (!summary?.paragraphs.length) return "";

  const body = summary.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#1e293b;">${escapeHtmlForPdf(p)}</p>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:20px 22px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:12px;">🧠 AI 성장 요약</div>
      ${body}
    </div>`);
}
