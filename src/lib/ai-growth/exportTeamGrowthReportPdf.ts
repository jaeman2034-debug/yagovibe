import {
  buildTeamGrowthReportPdfSections,
  type TeamGrowthReportPdfSectionsInput,
} from "@/lib/ai-growth/teamGrowthReportPdfSections";
import {
  escapeHtmlForPdf,
  PDF_CONTENT_WIDTH_PX,
  renderHtmlToPdf,
} from "@/lib/ai-growth/renderHtmlToPdf";
import { buildGrowthReportLegalFooterHtml } from "@/lib/legal/growthReportPdfFooterHtml";

const PDF_ROOT_ID = "yago-team-growth-pdf-root";

export type TeamGrowthReportPdfInput = TeamGrowthReportPdfSectionsInput & {
  teamName: string;
  generatedAtMs?: number;
};

function formatReportDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildTeamGrowthReportPdfFilename(
  teamName: string,
  generatedAtMs: number
): string {
  const safe = (teamName.trim() || "팀").replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}_팀성장리포트_${formatReportDate(generatedAtMs)}.pdf`;
}

function buildTeamGrowthReportPdfHtml(input: TeamGrowthReportPdfInput): string {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const teamName = input.teamName.trim() || "팀";
  const sections = buildTeamGrowthReportPdfSections(input);

  return `
    <div id="${PDF_ROOT_ID}" style="width:${PDF_CONTENT_WIDTH_PX}px;padding:24px 20px 32px;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#fff;color:#0f172a;box-sizing:border-box;">
      <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;">YAGO SPORTS · Team Growth Report</div>
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-top:8px;">${escapeHtmlForPdf(teamName)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px;">생성일 ${formatReportDate(generatedAt)}</div>
        ${
          input.teamSummary?.headline
            ? `<div style="font-size:14px;font-weight:700;color:#0369a1;margin-top:10px;">${escapeHtmlForPdf(input.teamSummary.headline)}</div>`
            : ""
        }
      </div>
      ${sections}
      ${buildGrowthReportLegalFooterHtml()}
    </div>`;
}

/** Sprint E-1.4 — 코치용 팀 성장 PDF 리포트 */
export async function exportTeamGrowthReportPdf(
  input: TeamGrowthReportPdfInput
): Promise<string> {
  const generatedAt = input.generatedAtMs ?? Date.now();
  const html = buildTeamGrowthReportPdfHtml({ ...input, generatedAtMs: generatedAt });
  const filename = buildTeamGrowthReportPdfFilename(input.teamName, generatedAt);
  return renderHtmlToPdf(html, filename, PDF_ROOT_ID);
}
