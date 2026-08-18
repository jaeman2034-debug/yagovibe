import type { EvidenceReportItem, GuardianReportMetadata } from "@/components/ai-growth/growthReportTrust";
import type { GuardianNarrativeResult, ReportTone } from "@/components/ai-growth/guardianNarrative";
import { reportToneLabel } from "@/components/ai-growth/guardianNarrative";
import type { GrowthScoreDelta, GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import {
  growthLetterGradeHint,
  growthLetterGradePdfBadgeHtml,
  scoreToGrowthLetterGrade,
} from "@/lib/ai-growth/growthLetterGrade";
import {
  formatDimensionScoreDisplay,
  pickPrimaryStrengths,
} from "@/lib/ai-growth/growthScore";
import type { MonthlyGrowthTimeline } from "@/lib/ai-growth/monthlyGrowthTimeline";
import {
  buildDimensionComparisonRows,
  buildParentComparisonSummary,
  formatGrowthSessionDateLabel,
  findSessionByGeneratedAt,
} from "@/lib/ai-growth/growthSessionComparison";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import { computeGrowthProfileRadar } from "@/lib/ai-growth/growthProfileRadar";
import { buildGrowthProfileRadarSvg } from "@/lib/ai-growth/growthProfileRadarSvg";
import {
  PDF_CONTENT_WIDTH_PX,
  PDF_FULL_WIDTH_STYLE,
  pdfSection,
  renderHtmlToPdf,
} from "@/lib/ai-growth/renderHtmlToPdf";

/** PDF 1페이지 폭의 ~50% — A4 인쇄용 레이더 */
const PDF_RADAR_SIZE_PX = 360;
import { formatAtLabel } from "@/components/ai-growth/guardianReportCopy";
import { buildGrowthReportLegalFooterHtml } from "@/lib/legal/growthReportPdfFooterHtml";
import { isFiiEngineV1Enabled, isTacticalAgentV1Enabled } from "@/lib/fii/fiiFeatureFlags";
import { buildFiiV1PdfSection, buildTacticalTrainingTop3PdfSection } from "@/lib/fii/fiiPdfSection";
import {
  buildParentDimensionDeltaDisplay,
  formatParentDeltaBadge,
  PARENT_GROWTH_COMPARISON_FOOTNOTE,
  PARENT_GROWTH_DECLINE_SUPPORT,
  PARENT_GROWTH_FIRST_RECORD_BODY,
  PARENT_GROWTH_FIRST_RECORD_TITLE,
} from "@/lib/ai-growth/parentGrowthCopy";
import type { WeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyDigestTypes";
import { buildWeeklyGrowthDigestPdfSection } from "@/lib/ai-growth/weeklyGrowthDigestPdfSection";
import type { GrowthAiSummaryResult } from "@/lib/ai-growth/growthAiSummaryTypes";
import { buildGrowthAiSummaryPdfSection } from "@/lib/ai-growth/growthAiSummaryPdfSection";

export type GrowthReportPdfInput = {
  playerName: string;
  teamName?: string;
  metadata: GuardianReportMetadata;
  growthScore: GrowthScoreResult | null;
  growthScoreDelta: GrowthScoreDelta | null;
  /** P1-b — Step 5와 동일 SoT (직전 세션 축별 delta) */
  historySessions?: PlayerGrowthSessionDoc[];
  monthlyTimeline?: MonthlyGrowthTimeline | null;
  narrative: GuardianNarrativeResult;
  evidenceItems: EvidenceReportItem[];
  reportTone: ReportTone;
  confusionNote?: string;
  readAloudNote?: string;
  /** Sprint D-5.3-c — PDF 주간 요약 블록 */
  weeklyGrowthDigest?: WeeklyGrowthDigestEnrichment | null;
  /** Sprint D-5.5-d — PDF AI 성장 요약 */
  aiGrowthSummary?: GrowthAiSummaryResult | null;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatReportDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildGrowthReportPdfFilename(playerName: string, generatedAt: number): string {
  const safe = (playerName.trim() || "선수").replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}_성장리포트_${formatReportDate(generatedAt)}.pdf`;
}

/** Sprint C-1c — PDF parent hero (Step5 ParentGrowthHeroCard parity) */
export function buildParentGrowthHeroPdfSection(input: GrowthReportPdfInput, name: string): string {
  const gs = input.growthScore;
  const delta = input.growthScoreDelta;
  const currentOverall = gs?.snapshot.overall ?? null;
  const hasComparison =
    gs != null &&
    currentOverall != null &&
    currentOverall > 0 &&
    delta?.previousOverall != null &&
    delta.delta !== null &&
    delta.previousSessionAt != null;

  const coachNotes = [input.confusionNote?.trim(), input.readAloudNote?.trim()].filter(Boolean);
  const coachBlock =
    coachNotes.length > 0
      ? `<hr style="border:none;border-top:1px solid #6ee7b7;margin:18px 0;" />
         <div style="font-size:12px;font-weight:700;color:#047857;margin-bottom:8px;">코치 코멘트</div>
         ${coachNotes
           .map(
             (note) =>
               `<p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#065f46;">${escapeHtml(note!)}</p>`
           )
           .join("")}`
      : "";

  if (!gs || currentOverall == null || currentOverall <= 0) {
    return pdfSection(`
    <div style="${PDF_FULL_WIDTH_STYLE}padding:22px 20px;background:#ecfdf5;border-radius:14px;border:2px solid #34d399;">
      <div style="font-size:18px;font-weight:900;color:#065f46;">학부모 성장 요약</div>
      <div style="font-size:12px;color:#059669;margin-top:4px;">${name} · 코치가 확인한 훈련 리포트</div>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#065f46;">코치가 훈련 장면을 확인·승인하면 성장 점수와 비교가 표시됩니다.</p>
      ${coachBlock}
    </div>`);
  }

  if (!hasComparison) {
    const bodyHtml = PARENT_GROWTH_FIRST_RECORD_BODY.split("\n")
      .map((line) => `<p style="margin:6px 0;font-size:13px;line-height:1.55;color:#065f46;">${escapeHtml(line)}</p>`)
      .join("");
    return pdfSection(`
    <div style="${PDF_FULL_WIDTH_STYLE}padding:22px 20px;background:#ecfdf5;border-radius:14px;border:2px solid #34d399;">
      <div style="font-size:18px;font-weight:900;color:#065f46;">학부모 성장 요약</div>
      <div style="font-size:12px;color:#059669;margin-top:4px;">${name} · 코치가 확인한 훈련 리포트</div>
      <div style="margin-top:18px;padding:18px;background:#fff;border-radius:12px;border:1px solid #a7f3d0;text-align:center;">
        <div style="font-size:44px;font-weight:900;color:#064e3b;line-height:1;">${currentOverall}<span style="font-size:18px;font-weight:700;">점</span></div>
        <div style="font-size:12px;font-weight:600;color:#64748b;margin-top:6px;">이번 훈련</div>
      </div>
      <div style="margin-top:16px;padding:16px;background:#fff;border-radius:12px;border:1px solid #a7f3d0;text-align:center;">
        <div style="font-size:14px;font-weight:800;color:#065f46;">${escapeHtml(PARENT_GROWTH_FIRST_RECORD_TITLE)}</div>
        ${bodyHtml}
      </div>
      ${coachBlock}
    </div>`);
  }

  const previousSession = findSessionByGeneratedAt(
    input.historySessions ?? [],
    delta!.previousSessionAt!
  );
  const dimensionRows = buildDimensionComparisonRows(
    gs.snapshot,
    previousSession?.metrics.growthScore
  );
  const summary = buildParentComparisonSummary(delta, dimensionRows);
  const deltaBadge = formatParentDeltaBadge(delta!.delta!);
  const badgeBg =
    deltaBadge.tone === "up" ? "#059669" : deltaBadge.tone === "down" ? "#e2e8f0" : "#f1f5f9";
  const badgeColor =
    deltaBadge.tone === "up" ? "#fff" : deltaBadge.tone === "down" ? "#334155" : "#334155";

  const visibleDimensions = dimensionRows
    .map((row) => ({ row, display: buildParentDimensionDeltaDisplay(row) }))
    .filter(
      (item): item is { row: (typeof dimensionRows)[number]; display: NonNullable<ReturnType<typeof buildParentDimensionDeltaDisplay>> } =>
        item.display != null
    );
  const dimensionHtml =
    visibleDimensions.length > 0
      ? `<hr style="border:none;border-top:1px solid #6ee7b7;margin:18px 0;" />
         <div style="font-size:12px;font-weight:700;color:#047857;margin-bottom:8px;">항목별 변화</div>
         ${visibleDimensions
           .map(({ row, display: item }) => {
             const color =
               (row.delta ?? 0) > 0 ? "#047857" : (row.delta ?? 0) < 0 ? "#475569" : "#64748b";
             const explanation = item.explanation
               ? `<p style="margin:6px 0 0;font-size:11px;line-height:1.5;color:#475569;">${escapeHtml(item.explanation)}</p>`
               : "";
             return `<div style="padding:12px;margin:8px 0;background:#fff;border-radius:10px;border:1px solid #a7f3d0;">
               <div style="font-size:14px;font-weight:700;color:#065f46;">${escapeHtml(item.title)}</div>
               <div style="font-size:13px;font-weight:800;color:${color};margin-top:4px;">${escapeHtml(item.deltaLine)}</div>
               ${explanation}
             </div>`;
           })
           .join("")}`
      : "";

  const declineSupport =
    deltaBadge.tone === "down"
      ? `<p style="margin:10px 0 0;font-size:13px;font-weight:600;color:#065f46;">${escapeHtml(PARENT_GROWTH_DECLINE_SUPPORT)}</p>`
      : "";

  return pdfSection(`
    <div style="${PDF_FULL_WIDTH_STYLE}padding:22px 20px;background:#ecfdf5;border-radius:14px;border:2px solid #34d399;">
      <div style="font-size:18px;font-weight:900;color:#065f46;">학부모 성장 요약</div>
      <div style="font-size:12px;color:#059669;margin-top:4px;">${name} · 코치가 확인한 훈련 리포트</div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:stretch;margin-top:18px;width:100%;">
        <div style="padding:16px;background:#fff;border-radius:12px;border:1px solid #a7f3d0;text-align:center;">
          <div style="font-size:12px;font-weight:600;color:#64748b;">지난 훈련</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${escapeHtml(formatGrowthSessionDateLabel(delta!.previousSessionAt!))}</div>
          <div style="font-size:40px;font-weight:900;color:#064e3b;margin-top:8px;line-height:1;">${delta!.previousOverall}<span style="font-size:16px;font-weight:700;">점</span></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;font-size:28px;color:#10b981;font-weight:700;">→</div>
        <div style="padding:16px;background:#fff;border-radius:12px;border:1px solid #a7f3d0;text-align:center;">
          <div style="font-size:12px;font-weight:600;color:#64748b;">이번 훈련</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${escapeHtml(formatReportDate(input.metadata.generatedAt))}</div>
          <div style="font-size:40px;font-weight:900;color:#064e3b;margin-top:8px;line-height:1;">${currentOverall}<span style="font-size:16px;font-weight:700;">점</span></div>
        </div>
      </div>
      <div style="margin-top:16px;text-align:center;">
        <span style="display:inline-block;padding:10px 24px;background:${badgeBg};color:${badgeColor};border-radius:999px;font-size:18px;font-weight:900;">${escapeHtml(deltaBadge.label)}</span>
        ${declineSupport}
      </div>
      ${
        summary
          ? `<p style="margin:14px 0 0;font-size:14px;font-weight:600;line-height:1.55;color:#065f46;text-align:center;">${escapeHtml(summary)}</p>`
          : ""
      }
      <p style="margin:10px 0 0;font-size:11px;color:#059669;text-align:center;">${escapeHtml(PARENT_GROWTH_COMPARISON_FOOTNOTE)}</p>
      ${dimensionHtml}
      ${coachBlock}
    </div>`);
}

function buildHeroSummaryCard(input: GrowthReportPdfInput, name: string): string {
  const eventCount = input.metadata.reviewedEventCount;
  const gs = input.growthScore;

  if (!gs || gs.snapshot.overall <= 0) {
    return pdfSection(`
    <div style="${PDF_FULL_WIDTH_STYLE}padding:24px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:16px;color:#fff;text-align:center;">
      <div style="font-size:13px;opacity:0.9;letter-spacing:1px;">YAGO GROWTH</div>
      <div style="font-size:24px;font-weight:900;margin:12px 0 4px;">${name} 성장 리포트</div>
      <div style="font-size:14px;opacity:0.95;">이번 훈련에서 확인된 성장 장면 ${eventCount}건 · ${formatReportDate(input.metadata.generatedAt)}</div>
      <div style="margin-top:12px;font-size:12px;opacity:0.85;">Growth Score는 코치 승인 후 표시됩니다.</div>
    </div>`);
  }

  const strengths = pickPrimaryStrengths(gs.dimensions);
  const strengthsHtml =
    strengths.length > 0
      ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.25);text-align:left;font-size:13px;">
          <div style="font-weight:700;margin-bottom:8px;">주요 강점</div>
          ${strengths.map((s) => `<div style="margin:4px 0;">✓ ${escapeHtml(s)}</div>`).join("")}
        </div>`
      : "";

  const deltaLine = input.growthScoreDelta?.narrative
    ? `<div style="margin-top:12px;font-size:12px;opacity:0.9;">${escapeHtml(input.growthScoreDelta.narrative)}</div>`
    : "";

  const letter = scoreToGrowthLetterGrade(gs.snapshot.overall);
  const gradeTagline = letter
    ? growthLetterGradeHint(letter)
    : gs.parentHint;
  const gradeHero = letter
    ? `<div style="margin:10px 0 6px;">${growthLetterGradePdfBadgeHtml(letter, "hero")}</div>
       <div style="font-size:28px;font-weight:900;line-height:1.1;margin:4px 0;">${gs.snapshot.overall}<span style="font-size:16px;font-weight:700;">점</span></div>
       <div style="font-size:14px;opacity:0.95;margin-top:8px;line-height:1.5;">${escapeHtml(gradeTagline)}</div>`
    : `<div style="font-size:48px;font-weight:900;line-height:1.1;margin:6px 0;">${gs.snapshot.overall}<span style="font-size:20px;">점</span></div>`;

  return pdfSection(`
    <div style="${PDF_FULL_WIDTH_STYLE}padding:28px 24px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:16px;color:#fff;">
      <div style="text-align:center;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:16px;margin-bottom:16px;">
        <div style="font-size:28px;font-weight:900;margin:0 0 8px;line-height:1.25;">${name} 선수 성장 리포트</div>
        <div style="font-size:15px;opacity:0.95;">코치가 직접 검증한 성장 기록 · ${formatReportDate(input.metadata.generatedAt)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;width:100%;">
        <div style="text-align:center;">
          <div style="font-size:13px;opacity:0.9;">현재 성장 수준</div>
          ${gradeHero}
        </div>
        <div style="font-size:14px;">
          <div style="padding:10px 12px;background:rgba(255,255,255,0.12);border-radius:8px;margin-bottom:8px;">
            <span style="opacity:0.85;">성장 장면</span>
            <strong style="float:right;font-size:16px;">${eventCount}건</strong>
          </div>
          <div style="padding:10px 12px;background:rgba(255,255,255,0.12);border-radius:8px;">
            <span style="opacity:0.85;">리포트 톤</span>
            <strong style="float:right;">${escapeHtml(reportToneLabel(input.reportTone))}</strong>
          </div>
        </div>
      </div>
      ${strengthsHtml}
      ${deltaLine}
    </div>`);
}

function buildDetailedScoreSection(gs: GrowthScoreResult, delta: GrowthScoreDelta | null): string {
  const profileRadar = computeGrowthProfileRadar(gs);
  const radarSvg = buildGrowthProfileRadarSvg(profileRadar, { size: PDF_RADAR_SIZE_PX });
  const strengths = pickPrimaryStrengths(gs.dimensions);
  const strengthsBlock =
    strengths.length > 0
      ? `<div style="margin-top:14px;padding:12px;background:#f8fafc;border-radius:8px;">
          <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">주요 강점</div>
          ${strengths.map((s) => `<div style="font-size:12px;color:#475569;margin:3px 0;">✓ ${escapeHtml(s)}</div>`).join("")}
        </div>`
      : "";

  const letter = scoreToGrowthLetterGrade(gs.snapshot.overall);
  const gradeBlock = letter
    ? `<div style="margin:6px 0;">${growthLetterGradePdfBadgeHtml(letter, "detail")}</div>
       <div style="font-size:22px;font-weight:900;color:#312e81;">${gs.snapshot.overall}<span style="font-size:14px;font-weight:600;">점</span></div>`
    : `<div style="font-size:36px;font-weight:900;color:#312e81;margin:6px 0;">${gs.snapshot.overall}<span style="font-size:16px;font-weight:600;">점</span></div>`;

  return pdfSection(`
    <div style="${PDF_FULL_WIDTH_STYLE}padding:20px;background:#eef2ff;border-radius:12px;border:1px solid #c7d2fe;">
      <div style="font-size:14px;color:#4338ca;font-weight:700;">Growth Score 상세</div>
      <div style="display:grid;grid-template-columns:minmax(360px,42%) 1fr;gap:24px;align-items:start;margin-top:14px;width:100%;">
        <div style="text-align:center;">
          <div style="font-size:12px;color:#6366f1;margin-bottom:8px;">5축 성장 프로파일</div>
          ${radarSvg}
        </div>
        <div>
      <div style="font-size:13px;color:#6366f1;">종합 성장 등급</div>
      ${gradeBlock}
      <div style="font-size:12px;color:#4f46e5;margin-top:6px;line-height:1.45;">${escapeHtml(gs.parentHint)}</div>
      ${strengthsBlock}
      ${
        delta?.narrative
          ? `<div style="margin-top:10px;font-size:11px;color:#3730a3;">${escapeHtml(delta.narrative)}</div>`
          : ""
      }
        </div>
      </div>
      <table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 0;color:#64748b;font-weight:600;border-bottom:2px solid #c7d2fe;">5축 프로파일</th>
            <th style="text-align:right;padding:6px 0;color:#64748b;font-weight:600;border-bottom:2px solid #c7d2fe;">점수 · 등급</th>
          </tr>
        </thead>
        <tbody>
          ${profileRadar.axes
            .map((a) => {
              const display = formatDimensionScoreDisplay(a.score);
              const isMissing = a.score === null;
              const dimLetter = a.score !== null ? scoreToGrowthLetterGrade(a.score) : null;
              const scoreCell = isMissing
                ? display
                : dimLetter
                  ? `${a.score}점 · <strong>${dimLetter}</strong>`
                  : `${a.score}점`;
              return `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e0e7ff;color:#475569;">${escapeHtml(a.label)}<br/><span style="font-size:10px;color:#94a3b8;">${escapeHtml(a.labelKo)}</span></td>
              <td style="padding:10px 0;border-bottom:1px solid #e0e7ff;text-align:right;font-weight:700;color:${isMissing ? "#94a3b8" : "#312e81"};font-size:${isMissing ? "11px" : "15px"};">${scoreCell}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
      <p style="margin:12px 0 6px;font-size:11px;font-weight:700;color:#4338ca;">코치 검증 축 (기술)</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 0;color:#64748b;font-weight:600;border-bottom:2px solid #c7d2fe;">항목</th>
            <th style="text-align:right;padding:6px 0;color:#64748b;font-weight:600;border-bottom:2px solid #c7d2fe;">점수 · 등급</th>
          </tr>
        </thead>
        <tbody>
          ${gs.dimensions
            .map((d) => {
              const display = formatDimensionScoreDisplay(d.score);
              const isMissing = d.score === null;
              const dimLetter =
                d.score !== null ? scoreToGrowthLetterGrade(d.score) : null;
              const scoreCell = isMissing
                ? display
                : dimLetter
                  ? `${d.score}점 · <strong>${dimLetter}</strong>`
                  : `${d.score}점`;
              return `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e0e7ff;color:#475569;font-weight:600;">${escapeHtml(d.labelKo)}<br/><span style="font-size:10px;font-weight:400;color:#94a3b8;">${escapeHtml(d.label)}</span></td>
              <td style="padding:10px 0;border-bottom:1px solid #e0e7ff;text-align:right;font-weight:700;color:${isMissing ? "#94a3b8" : "#312e81"};font-size:${isMissing ? "11px" : "15px"};">${scoreCell}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
      <p style="margin-top:10px;font-size:10px;color:#64748b;">미관찰 항목은 이번 영상에서 코치가 확인한 장면이 없어 점수에 포함되지 않았습니다.</p>
    </div>`);
}

function buildMonthlyTimelineSection(timeline: MonthlyGrowthTimeline): string {
  if (!timeline.hasEnoughData || timeline.points.length < 2) return "";

  const bars = timeline.points
    .map((p) => {
      const h = Math.max(24, Math.round((p.overall / 100) * 80));
      return `
        <div style="flex:1;min-width:56px;text-align:center;">
          <div style="height:80px;display:flex;align-items:flex-end;justify-content:center;">
            <div style="width:36px;height:${h}px;background:linear-gradient(180deg,#10b981,#059669);border-radius:6px 6px 0 0;"></div>
          </div>
          <div style="font-size:18px;font-weight:900;color:#064e3b;margin-top:6px;">${p.overall}</div>
          <div style="font-size:11px;color:#64748b;">${escapeHtml(p.label)}</div>
        </div>`;
    })
    .join("");

  const delta =
    timeline.spanDelta !== null
      ? `<div style="margin-top:12px;font-size:14px;font-weight:700;color:#047857;">
          누적 성장 ${timeline.spanDelta > 0 ? "+" : ""}${timeline.spanDelta}점
        </div>`
      : "";

  return pdfSection(`
    <div style="${PDF_FULL_WIDTH_STYLE}padding:20px;background:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;">
      <div style="font-size:14px;color:#047857;font-weight:700;">월간 성장 추적</div>
      <div style="font-size:14px;color:#065f46;margin-top:4px;">지난달보다 좋아졌나?</div>
      <div style="display:flex;gap:12px;align-items:flex-end;justify-content:space-between;margin-top:16px;width:100%;">${bars}</div>
      ${delta}
      ${
        timeline.parentNarrative
          ? `<p style="margin-top:10px;font-size:12px;color:#065f46;line-height:1.5;">${escapeHtml(timeline.parentNarrative)}</p>`
          : ""
      }
    </div>`);
}

export function buildGrowthReportHtml(input: GrowthReportPdfInput): string {
  const name = escapeHtml(input.playerName.trim() || "선수");
  const team = input.teamName?.trim() ? escapeHtml(input.teamName.trim()) : "";
  const date = formatReportDate(input.metadata.generatedAt);

  const parentGrowthHero = buildParentGrowthHeroPdfSection(input, name);

  const heroCard = buildHeroSummaryCard(input, name);

  const monthlySection =
    input.monthlyTimeline && input.monthlyTimeline.hasEnoughData
      ? buildMonthlyTimelineSection(input.monthlyTimeline)
      : "";

  const scoreSection = input.growthScore
    ? buildDetailedScoreSection(input.growthScore, input.growthScoreDelta)
    : `<p style="color:#64748b;font-size:13px;">코치 승인 이벤트가 없어 Growth Score를 계산하지 않았습니다.</p>`;

  const tacticalTop3Section =
    input.growthScore && isFiiEngineV1Enabled() && isTacticalAgentV1Enabled()
      ? buildTacticalTrainingTop3PdfSection(input.growthScore)
      : "";

  const fiiSection =
    input.growthScore && isFiiEngineV1Enabled()
      ? buildFiiV1PdfSection(input.growthScore)
      : "";

  const blocksHtml =
    input.narrative.eventBlocks.length > 0
      ? input.narrative.eventBlocks
          .map(
            (block) => pdfSection(`
        <div style="${PDF_FULL_WIDTH_STYLE}padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
          <div style="font-size:14px;font-weight:800;color:#5b21b6;margin-bottom:4px;">${escapeHtml(block.labelKo)}</div>
          <div style="font-size:11px;color:#7c3aed;">${escapeHtml(block.atLabel)} · 영상 구간</div>
          <p style="margin:10px 0 6px;font-size:11px;font-weight:700;color:#6366f1;">무엇을 잘했는가</p>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.55;">${escapeHtml(block.behavior)}</p>
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#059669;">왜 중요한가</p>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.55;">${escapeHtml(block.meaning)}</p>
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#2563eb;">다음 훈련</p>
          <p style="margin:0;font-size:13px;line-height:1.55;">${escapeHtml(block.training)}</p>
        </div>`)
          )
          .join("")
      : input.evidenceItems
          .map(
            (item) => pdfSection(`
        <div style="${PDF_FULL_WIDTH_STYLE}padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
          <div style="font-size:12px;font-weight:700;color:#7c3aed;">${escapeHtml(item.eventType)} · ${escapeHtml(formatAtLabel(item.seekSeconds))}</div>
          <p style="margin:10px 0 6px;font-size:11px;font-weight:700;color:#6366f1;">무엇을 잘했는가</p>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.55;">${escapeHtml(item.claim)}</p>
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#059669;">왜 중요한가</p>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.55;">${escapeHtml(item.meaning)}</p>
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#2563eb;">다음 훈련</p>
          <p style="margin:0;font-size:13px;line-height:1.55;">${escapeHtml(item.training)}</p>
        </div>`)
          )
          .join("");

  const introBody = input.narrative.body
    .slice(0, 3)
    .map((p) => `<p style="font-size:13px;line-height:1.6;margin:8px 0;">${escapeHtml(p)}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="ko" style="width:${PDF_CONTENT_WIDTH_PX}px;margin:0;">
<head><meta charset="utf-8" /></head>
<body style="width:${PDF_CONTENT_WIDTH_PX}px;margin:0;padding:0;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#0f172a;background:#fff;">
  <div id="yago-growth-pdf-root" style="width:${PDF_CONTENT_WIDTH_PX}px;max-width:${PDF_CONTENT_WIDTH_PX}px;padding:24px 20px;box-sizing:border-box;margin:0;">
    ${pdfSection(`<div style="font-size:11px;color:#94a3b8;">YAGO GROWTH · AI 분석 → 코치 검증 → 학부모 리포트</div>`)}
    ${parentGrowthHero}
    ${buildGrowthAiSummaryPdfSection(input.aiGrowthSummary)}
    ${buildWeeklyGrowthDigestPdfSection(input.weeklyGrowthDigest)}
    <div style="font-size:11px;color:#64748b;margin-bottom:12px;">검증일 ${date}${team ? ` · ${team}` : ""}</div>
    ${heroCard}
    ${tacticalTop3Section}
    ${monthlySection}
    ${scoreSection}
    ${fiiSection}
    ${pdfSection(`
    <h2 style="font-size:16px;margin:0 0 8px;color:#0f172a;">${escapeHtml(input.narrative.headline)}</h2>
    <p style="font-size:14px;line-height:1.6;font-weight:600;margin:0 0 12px;">${escapeHtml(input.narrative.opening)}</p>
    ${introBody}`)}
    ${pdfSection(`<h2 style="font-size:15px;margin:0 0 10px;color:#0f172a;">코치 검증 장면</h2>
    ${blocksHtml || '<p style="font-size:13px;color:#64748b;">검증된 장면이 없습니다.</p>'}`)}
    <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;line-height:1.5;">
      ${escapeHtml(input.narrative.footer)}<br/>
      코치가 영상으로 확인·승인한 내용만 포함됩니다. · YAGO VIBE Sports
    </div>
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;line-height:1.55;">
      ${buildGrowthReportLegalFooterHtml(input.metadata.generatedAt)}
    </div>
  </div>
</body>
</html>`;
}

export async function exportGrowthReportPdf(input: GrowthReportPdfInput): Promise<string> {
  if (input.metadata.reviewedEventCount === 0 && input.evidenceItems.length === 0) {
    throw new Error("PDF를 만들려면 코치 승인 이벤트가 최소 1건 필요합니다.");
  }

  const filename = buildGrowthReportPdfFilename(input.playerName, input.metadata.generatedAt);
  return renderHtmlToPdf(buildGrowthReportHtml(input), filename, "yago-growth-pdf-root");
}
