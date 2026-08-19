import { renderHtmlToPdf } from "@/lib/ai-growth/renderHtmlToPdf";
import {
  buildVocReportPdfFilename,
  buildVocReportPdfHtml,
  VOC_REPORT_PDF_ROOT_ID,
  type VocReportPdfInput,
} from "@/lib/voc/pdf/vocReportPdfDocument";

export type { VocReportPdfInput, VocReportStats } from "@/lib/voc/pdf/vocReportPdfDocument";
export { buildVocReportPdfFilename, buildVocReportPdfHtml } from "@/lib/voc/pdf/vocReportPdfDocument";

/** I-2.5 — VOC Pilot Report PDF export */
export async function exportVocReportPdf(input: VocReportPdfInput): Promise<string> {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const html = buildVocReportPdfHtml({ ...input, generatedAtMs: generatedAt });
  const filename = buildVocReportPdfFilename(input.reportTitle ?? "VOC", generatedAt);
  return renderHtmlToPdf(html, filename, VOC_REPORT_PDF_ROOT_ID);
}
