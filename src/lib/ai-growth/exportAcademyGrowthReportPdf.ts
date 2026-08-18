import {
  buildAcademyGrowthReportPdfSections,
  type AcademyGrowthReportPdfSectionsInput,
} from "@/lib/ai-growth/academyGrowthReportPdfSections";
import {
  escapeHtmlForPdf,
  PDF_CONTENT_WIDTH_PX,
  renderHtmlToPdf,
} from "@/lib/ai-growth/renderHtmlToPdf";
import { buildGrowthReportLegalFooterHtml } from "@/lib/legal/growthReportPdfFooterHtml";

const PDF_ROOT_ID = "yago-academy-growth-pdf-root";

export type AcademyGrowthReportPdfInput = AcademyGrowthReportPdfSectionsInput & {
  academyName: string;
  generatedAtMs?: number;
};

function formatReportDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildAcademyGrowthReportPdfFilename(
  academyName: string,
  generatedAtMs: number
): string {
  const safe = (academyName.trim() || "아카데미").replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}_아카데미성장리포트_${formatReportDate(generatedAtMs)}.pdf`;
}

export function buildAcademyGrowthReportPdfHtml(input: AcademyGrowthReportPdfInput): string {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const academyName = input.academyName.trim() || "아카데미";
  const sections = buildAcademyGrowthReportPdfSections(input);

  return `
    <div id="${PDF_ROOT_ID}" style="width:${PDF_CONTENT_WIDTH_PX}px;padding:24px 20px 32px;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#fff;color:#0f172a;box-sizing:border-box;">
      <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;">YAGO SPORTS · Academy Growth Report</div>
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-top:8px;">${escapeHtmlForPdf(academyName)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px;">생성일 ${formatReportDate(generatedAt)}</div>
        ${
          input.academyDashboard?.subline
            ? `<div style="font-size:14px;font-weight:700;color:#6d28d9;margin-top:10px;">${escapeHtmlForPdf(input.academyDashboard.subline)}</div>`
            : ""
        }
      </div>
      ${sections}
      ${buildGrowthReportLegalFooterHtml()}
    </div>`;
}

/** Sprint F-1.4 — 아카데미 운영 PDF 리포트 */
export async function exportAcademyGrowthReportPdf(
  input: AcademyGrowthReportPdfInput
): Promise<string> {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const html = buildAcademyGrowthReportPdfHtml({ ...input, generatedAtMs: generatedAt });
  const filename = buildAcademyGrowthReportPdfFilename(input.academyName, generatedAt);
  return renderHtmlToPdf(html, filename, PDF_ROOT_ID);
}
