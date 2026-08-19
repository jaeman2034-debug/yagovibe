import { GROWTH_REPORT_PDF_DISCLAIMER } from "@/lib/legal/consentCopy";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** PDF 마지막 고지문 + 생성 시각 (HTML 조각) */
export function buildGrowthReportLegalFooterHtml(generatedAtMs: number): string {
  const d = new Date(generatedAtMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const stamp = `${y}-${m}-${day} ${h}:${min}`;

  return `
    <p style="margin:0 0 6px;">${escapeHtml(GROWTH_REPORT_PDF_DISCLAIMER.generatedFrom)}</p>
    <p style="margin:0 0 10px;">${escapeHtml(GROWTH_REPORT_PDF_DISCLAIMER.referenceOnly)}</p>
    <p style="margin:0;font-size:9px;color:#94a3b8;">
      ${escapeHtml(GROWTH_REPORT_PDF_DISCLAIMER.generatedBy)}<br/>
      ${escapeHtml(stamp)}
    </p>`;
}
