import {
  buildAcademyOperationsReportPdfSections,
  type AcademyOperationsReportPdfSectionsInput,
} from "@/lib/ai-growth/academyOperationsReportPdfSections";
import {
  escapeHtmlForPdf,
  PDF_CONTENT_WIDTH_PX,
  renderHtmlToPdf,
} from "@/lib/ai-growth/renderHtmlToPdf";
import { buildGrowthReportLegalFooterHtml } from "@/lib/legal/growthReportPdfFooterHtml";

const PDF_ROOT_ID = "yago-academy-operations-pdf-root";

export type AcademyOperationsReportPdfInput = AcademyOperationsReportPdfSectionsInput & {
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

export function buildAcademyOperationsReportPdfFilename(
  academyName: string,
  generatedAtMs: number
): string {
  const safe = (academyName.trim() || "아카데미").replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}_아카데미운영리포트_${formatReportDate(generatedAtMs)}.pdf`;
}

export function buildAcademyOperationsReportPdfHtml(
  input: AcademyOperationsReportPdfInput
): string {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const academyName = input.academyName.trim() || "아카데미";
  const sections = buildAcademyOperationsReportPdfSections(input);

  return `
    <div id="${PDF_ROOT_ID}" style="width:${PDF_CONTENT_WIDTH_PX}px;padding:24px 20px 32px;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#fff;color:#0f172a;box-sizing:border-box;">
      <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;">YAGO SPORTS · Academy Operations Report</div>
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-top:8px;">${escapeHtmlForPdf(academyName)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px;">생성일 ${formatReportDate(generatedAt)}</div>
        <div style="font-size:14px;font-weight:700;color:#0f766e;margin-top:10px;">출석 · 세션 · 코치 운영 인텔리전스</div>
      </div>
      ${sections}
      ${buildGrowthReportLegalFooterHtml()}
    </div>`;
}

/** Sprint F-2.4 — 아카데미 운영 PDF 리포트 */
export async function exportAcademyOperationsReportPdf(
  input: AcademyOperationsReportPdfInput
): Promise<string> {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const html = buildAcademyOperationsReportPdfHtml({ ...input, generatedAtMs: generatedAt });
  const filename = buildAcademyOperationsReportPdfFilename(input.academyName, generatedAt);
  return renderHtmlToPdf(html, filename, PDF_ROOT_ID);
}
