import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type { TeamWeeklyDigest } from "@/lib/ai-growth/teamWeeklyDigestTypes";

/** Sprint E-1.2-d — 팀 주간 요약 PDF 블록 (E-1.4 재사용) */
export function buildTeamWeeklyDigestPdfSection(
  digest: TeamWeeklyDigest | null | undefined
): string {
  if (!digest || digest.trackedPlayers === 0) return "";

  const rows: string[] = [
    `<div style="margin-bottom:8px;"><strong>추적 선수</strong> ${digest.trackedPlayers}/${digest.rosterCount}</div>`,
    `<div style="margin-bottom:8px;"><strong>평균 OVR</strong> ${digest.avgOvr} · <strong>Level</strong> ${digest.avgLevel}</div>`,
  ];

  if (digest.riskPlayerCount > 0) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>위험 선수</strong> ${digest.riskPlayerCount}명</div>`
    );
  }

  if (digest.newBadges.length > 0) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>신규 배지</strong> ${escapeHtmlForPdf(digest.newBadges.join(", "))}</div>`
    );
  }

  if (digest.focusTraining) {
    rows.push(
      `<div style="margin-bottom:8px;"><strong>집중 훈련</strong> ${escapeHtmlForPdf(digest.focusTraining)}</div>`
    );
  }

  const summaryHtml = digest.summary.paragraphs
    .map((p) => `<p style="margin:0 0 8px;">${escapeHtmlForPdf(p)}</p>`)
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#e0f2fe;border-radius:12px;border:2px solid #7dd3fc;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:900;color:#0c4a6e;margin-bottom:4px;">이번 주 팀 성장 요약</div>
      <div style="font-size:11px;color:#0369a1;margin-bottom:10px;">${escapeHtmlForPdf(digest.weekLabel)}</div>
      <div style="font-size:14px;line-height:1.65;color:#0c4a6e;">${rows.join("")}</div>
      ${summaryHtml ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #bae6fd;font-size:13px;line-height:1.65;color:#0c4a6e;">${summaryHtml}</div>` : ""}
    </div>`);
}
