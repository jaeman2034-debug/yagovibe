import {
  buildMultiAcademyReportPdfSections,
  type MultiAcademyReportPdfSectionsInput,
} from "@/lib/ai-growth/multiAcademyReportPdfSections";
import {
  escapeHtmlForPdf,
  PDF_CONTENT_WIDTH_PX,
  renderHtmlToPdf,
} from "@/lib/ai-growth/renderHtmlToPdf";
import { buildGrowthReportLegalFooterHtml } from "@/lib/legal/growthReportPdfFooterHtml";

const PDF_ROOT_ID = "yago-multi-academy-pdf-root";

export type MultiAcademyReportPdfInput = MultiAcademyReportPdfSectionsInput & {
  reportTitle?: string;
  generatedAtMs?: number;
};

function formatReportDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildMultiAcademyReportPdfFilename(
  reportTitle: string,
  generatedAtMs: number
): string {
  const safe = (reportTitle.trim() || "MultiAcademy").replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}_MultiAcademy리포트_${formatReportDate(generatedAtMs)}.pdf`;
}

export function buildMultiAcademyReportPdfHtml(input: MultiAcademyReportPdfInput): string {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const title = input.reportTitle?.trim() || "Multi Academy Intelligence";
  const sections = buildMultiAcademyReportPdfSections(input);
  const academyCount = input.dashboard?.kpi.academyCount ?? 0;

  return `
    <div id="${PDF_ROOT_ID}" style="width:${PDF_CONTENT_WIDTH_PX}px;padding:24px 20px 32px;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#fff;color:#0f172a;box-sizing:border-box;">
      <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;">YAGO SPORTS · Multi Academy Report</div>
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-top:8px;">${escapeHtmlForPdf(title)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px;">생성일 ${formatReportDate(generatedAt)}</div>
        <div style="font-size:14px;font-weight:700;color:#4338ca;margin-top:10px;">${academyCount}개 아카데미 · Dashboard · Risk · Coach · Operations</div>
      </div>
      ${sections}
      ${buildGrowthReportLegalFooterHtml()}
    </div>`;
}

/** Sprint G-1.6 — Multi Academy PDF 리포트 */
export async function exportMultiAcademyReportPdf(
  input: MultiAcademyReportPdfInput
): Promise<string> {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const html = buildMultiAcademyReportPdfHtml({ ...input, generatedAtMs: generatedAt });
  const filename = buildMultiAcademyReportPdfFilename(
    input.reportTitle ?? "MultiAcademy",
    generatedAt
  );
  return renderHtmlToPdf(html, filename, PDF_ROOT_ID);
}
