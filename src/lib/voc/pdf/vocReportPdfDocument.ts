import type { VocReportStats } from "@/lib/voc/aggregateVocReport";
import {
  buildVocReportPdfSections,
  type VocReportPdfSectionsInput,
} from "@/lib/voc/pdf/vocReportPdfSections";
import { escapeHtmlForPdf, PDF_CONTENT_WIDTH_PX } from "@/lib/ai-growth/renderHtmlToPdf";
import { buildGrowthReportLegalFooterHtml } from "@/lib/legal/growthReportPdfFooterHtml";

const PDF_ROOT_ID = "yago-voc-report-pdf-root";

export type VocReportPdfInput = VocReportPdfSectionsInput & {
  generatedAtMs?: number;
};

function formatReportDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildVocReportPdfFilename(
  reportTitle: string,
  generatedAtMs: number
): string {
  const safe = (reportTitle.trim() || "VOC").replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}_VOC리포트_${formatReportDate(generatedAtMs)}.pdf`;
}

export function buildVocReportPdfHtml(input: VocReportPdfInput): string {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const title = input.reportTitle?.trim() || "VOC Pilot Report";
  const sections = buildVocReportPdfSections(input);
  const gateLabel = input.stats.meetsGate
    ? `n=${input.stats.totalCount} · Gate PASS`
    : `n=${input.stats.totalCount} · Gate 미달`;

  return `
    <div id="${PDF_ROOT_ID}" style="width:${PDF_CONTENT_WIDTH_PX}px;padding:24px 20px 32px;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#fff;color:#0f172a;box-sizing:border-box;">
      <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;">YAGO SPORTS · VOC Report · I-2.5</div>
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-top:8px;">${escapeHtmlForPdf(title)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px;">생성일 ${formatReportDate(generatedAt)}</div>
        <div style="font-size:14px;font-weight:700;color:#7c3aed;margin-top:10px;">${escapeHtmlForPdf(gateLabel)}</div>
      </div>
      ${sections}
      ${buildGrowthReportLegalFooterHtml(generatedAt)}
    </div>`;
}

export const VOC_REPORT_PDF_ROOT_ID = PDF_ROOT_ID;

export type { VocReportStats };
