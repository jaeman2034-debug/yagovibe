import type { GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import { formatDimensionScoreDisplay } from "@/lib/ai-growth/growthScore";
import {
  computeFiiV1FromGrowthScore,
  fiiV1GradeLabel,
} from "@/lib/fii/fiiEngineV1";
import {
  recommendTrainingV1,
  type TrainingRecommendation,
} from "@/lib/tacticalAgent/recommendTrainingV1";
import { mapRecommendationsForParent } from "@/lib/ai-growth/parentTrainingLanguage";
import { pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import {
  buildGlossaryPdfFootnoteHtml,
  P1_GLOSSARY_TERM_IDS,
} from "@/lib/glossary/yagoGlossary";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTrainingRecommendationsHtml(training: TrainingRecommendation[]): string {
  if (training.length === 0) return "";
  return training
    .map(
      (rec: TrainingRecommendation) => `
            <div style="margin:8px 0;padding:10px;background:#faf5ff;border-radius:8px;border:1px solid #e9d5ff;">
              <div style="font-size:11px;color:#7c3aed;font-weight:700;">우선도 ${rec.priority}</div>
              <div style="font-size:13px;font-weight:800;color:#1e1b4b;margin-top:4px;">${escapeHtml(rec.title)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.45;">${escapeHtml(rec.rationale)}</div>
            </div>`
    )
    .join("");
}

/** Sprint C-1.1 — PDF 1페이지: 성장 Hero 직후 TOP 3 훈련 추천 (가시성) */
export function buildTacticalTrainingTop3PdfSection(gs: GrowthScoreResult): string {
  const fii = computeFiiV1FromGrowthScore(gs);
  const training = mapRecommendationsForParent(recommendTrainingV1(fii));
  if (training.length === 0) return "";

  return pdfSection(`
    <div style="padding:18px 20px;background:linear-gradient(180deg,#faf5ff 0%,#fff 100%);border-radius:14px;border:2px solid #a78bfa;">
      <div style="font-size:16px;font-weight:900;color:#5b21b6;">다음 훈련 추천 TOP 3</div>
      <div style="font-size:12px;color:#7c3aed;margin-top:4px;">코치가 확인한 성장 데이터 기준 · 이번 주 연습 우선순위</div>
      ${buildTrainingRecommendationsHtml(training)}
    </div>`);
}

export function buildFiiV1PdfSection(gs: GrowthScoreResult): string {
  const fii = computeFiiV1FromGrowthScore(gs);
  const axisRows = fii.axes
    .map((axis) => {
      const scoreCell =
        axis.score !== null
          ? `${axis.score}점 · ${fiiV1GradeLabel(axis.score)}`
          : formatDimensionScoreDisplay(axis.score);
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#334155;">
            ${escapeHtml(axis.labelKo)}<br/>
            <span style="font-size:10px;color:#94a3b8;">${escapeHtml(axis.rationale)}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#312e81;">${scoreCell}</td>
        </tr>`;
    })
    .join("");

  return pdfSection(`
    <div style="padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #cbd5e1;">
      <div style="font-size:14px;color:#0f172a;font-weight:800;">FII* 점수 근거 (Football Intelligence Index v1)</div>
      <div style="font-size:13px;color:#475569;margin-top:6px;">
        종합 <strong>${fii.overall}점</strong> — Core 3축(코치 검증 GEV*)에서 FII 5축으로 환산
      </div>
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:80px;padding:8px;background:#eef2ff;border-radius:8px;text-align:center;">
          <div style="font-size:10px;color:#4338ca;">SCAN*</div>
          <div style="font-size:16px;font-weight:800;color:#312e81;">${formatDimensionScoreDisplay(fii.coreInputs.scan)}</div>
        </div>
        <div style="flex:1;min-width:80px;padding:8px;background:#eef2ff;border-radius:8px;text-align:center;">
          <div style="font-size:10px;color:#4338ca;">PRESS*</div>
          <div style="font-size:16px;font-weight:800;color:#312e81;">${formatDimensionScoreDisplay(fii.coreInputs.press)}</div>
        </div>
        <div style="flex:1;min-width:80px;padding:8px;background:#eef2ff;border-radius:8px;text-align:center;">
          <div style="font-size:10px;color:#4338ca;">회복</div>
          <div style="font-size:16px;font-weight:800;color:#312e81;">${formatDimensionScoreDisplay(fii.coreInputs.recovery)}</div>
        </div>
      </div>
      <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 0;color:#64748b;border-bottom:2px solid #cbd5e1;">FII 5축</th>
            <th style="text-align:right;padding:6px 0;color:#64748b;border-bottom:2px solid #cbd5e1;">점수</th>
          </tr>
        </thead>
        <tbody>${axisRows}</tbody>
      </table>
      <p style="margin-top:10px;font-size:10px;color:#64748b;line-height:1.5;">${escapeHtml(fii.overallFormula)}</p>
      <p style="margin-top:10px;font-size:9px;color:#94a3b8;line-height:1.6;">${buildGlossaryPdfFootnoteHtml(P1_GLOSSARY_TERM_IDS)}</p>
    </div>`);
}
