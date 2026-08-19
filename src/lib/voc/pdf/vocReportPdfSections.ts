import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import {
  formatPersonaAvgRows,
  VOC_REPORT_MIN_INTERVIEWS,
  type VocReportStats,
} from "@/lib/voc/aggregateVocReport";
import { VOC_PERSONA_LABELS, type VocPersona } from "@/lib/voc/vocFeedbackTypes";

export type VocReportPdfSectionsInput = {
  stats: VocReportStats;
  reportTitle?: string;
  teamLabel?: string;
};

function formatScore(value: number): string {
  return value > 0 ? `${value} / 5` : "—";
}

function starsForRating(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function buildRatingDistributionRows(
  distribution: VocReportStats["q1Distribution"],
  total: number
): string {
  const ratings = [5, 4, 3, 2, 1] as const;
  return ratings
    .map((rating) => {
      const count = distribution[rating];
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;">
        <span style="font-size:13px;color:#334155;min-width:72px;">${starsForRating(rating)}</span>
        <span style="font-size:12px;color:#64748b;flex:1;">${count}건 · ${pct}%</span>
      </div>`;
    })
    .join("");
}

function buildRankedList(
  items: { label: string; count: number }[],
  emptyLabel: string
): string {
  if (items.length === 0) {
    return `<div style="font-size:13px;color:#64748b;">${escapeHtmlForPdf(emptyLabel)}</div>`;
  }

  return items
    .map(
      (row, idx) =>
        `<div style="display:flex;gap:10px;margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
          <span style="font-size:12px;font-weight:800;color:#7c3aed;min-width:20px;">${idx + 1}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:#0f172a;">${escapeHtmlForPdf(row.label)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">${row.count}건</div>
          </div>
        </div>`
    )
    .join("");
}

function buildPersonaAvgTable(
  personaAvgQ2: VocReportStats["personaAvgQ2"],
  personaCounts: VocReportStats["personaCounts"]
): string {
  const rows = formatPersonaAvgRows(personaAvgQ2);
  return rows
    .map(
      (row) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
          <div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;">${escapeHtmlForPdf(row.label)}</div>
            <div style="font-size:11px;color:#64748b;">${personaCounts[row.persona]}건</div>
          </div>
          <div style="font-size:14px;font-weight:800;color:#7c3aed;">${formatScore(row.avg)}</div>
        </div>`
    )
    .join("");
}

function buildNpsBar(stats: VocReportStats): string {
  const { recommendNps } = stats;
  if (recommendNps.withRating === 0) {
    return `<div style="font-size:13px;color:#64748b;">추천 의향 응답이 아직 없습니다.</div>`;
  }

  return `
    <div style="display:flex;height:12px;overflow:hidden;border-radius:999px;background:#e2e8f0;margin-bottom:12px;">
      <div style="width:${recommendNps.promoterPct}%;background:#10b981;"></div>
      <div style="width:${recommendNps.passivePct}%;background:#94a3b8;"></div>
      <div style="width:${recommendNps.detractorPct}%;background:#f43f5e;"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      <div style="padding:10px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
        <div style="font-size:11px;font-weight:700;color:#047857;">추천 (4~5)</div>
        <div style="font-size:18px;font-weight:900;color:#065f46;">${recommendNps.promoters}</div>
        <div style="font-size:11px;color:#047857;">${recommendNps.promoterPct}%</div>
      </div>
      <div style="padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #cbd5e1;">
        <div style="font-size:11px;font-weight:700;color:#475569;">중립 (3)</div>
        <div style="font-size:18px;font-weight:900;color:#0f172a;">${recommendNps.passives}</div>
        <div style="font-size:11px;color:#475569;">${recommendNps.passivePct}%</div>
      </div>
      <div style="padding:10px;background:#fff1f2;border-radius:8px;border:1px solid #fecdd3;">
        <div style="font-size:11px;font-weight:700;color:#be123c;">비추천 (1~2)</div>
        <div style="font-size:18px;font-weight:900;color:#9f1239;">${recommendNps.detractors}</div>
        <div style="font-size:11px;color:#be123c;">${recommendNps.detractorPct}%</div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:13px;color:#334155;">
      NPS 스타일 점수: <strong>${recommendNps.npsScore ?? "—"}</strong>
      <span style="color:#64748b;"> · 응답 ${recommendNps.withRating}건</span>
    </div>`;
}

function buildGateBanner(stats: VocReportStats): string {
  if (stats.isEmpty) {
    return pdfSection(`
      <div style="padding:16px 18px;background:#f8fafc;border-radius:12px;border:2px dashed #cbd5e1;">
        <div style="font-size:14px;font-weight:800;color:#334155;">인터뷰 데이터 없음</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px;line-height:1.6;">
          VOC 인터뷰를 등록한 뒤 Pilot Report PDF를 생성할 수 있습니다.
        </div>
      </div>`);
  }

  if (!stats.meetsGate) {
    return pdfSection(`
      <div style="padding:16px 18px;background:#fffbeb;border-radius:12px;border:2px solid #fcd34d;">
        <div style="font-size:14px;font-weight:800;color:#92400e;">파일럿 Gate 미달 (n &lt; ${VOC_REPORT_MIN_INTERVIEWS})</div>
        <div style="font-size:13px;color:#a16207;margin-top:6px;line-height:1.6;">
          현재 ${stats.totalCount}건 · 목표 ${VOC_REPORT_MIN_INTERVIEWS}건 (코치·운영자·학부모 각 3건 권장)
        </div>
      </div>`);
  }

  return "";
}

function buildExecutiveSummarySection(input: VocReportPdfSectionsInput): string {
  const { stats, teamLabel } = input;
  const period = stats.collectionPeriod
    ? `${stats.collectionPeriod.startLabel} ~ ${stats.collectionPeriod.endLabel}`
    : "—";

  const personaLines = (["coach", "operator", "parent"] as VocPersona[])
    .map((p) => `${VOC_PERSONA_LABELS[p]} ${stats.personaCounts[p]}건`)
    .join(" · ");

  return pdfSection(`
    <div style="padding:18px 20px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;">
      <div style="font-size:13px;font-weight:900;color:#5b21b6;margin-bottom:8px;">1. Executive Summary</div>
      ${teamLabel ? `<div style="font-size:12px;color:#6d28d9;margin-bottom:8px;">${escapeHtmlForPdf(teamLabel)}</div>` : ""}
      <div style="font-size:28px;font-weight:900;color:#312e81;margin-bottom:10px;">총 ${stats.totalCount}건</div>
      <div style="font-size:14px;line-height:1.8;color:#4c1d95;">
        <div><strong>Persona</strong> ${escapeHtmlForPdf(personaLines)}</div>
        <div><strong>수집 기간</strong> ${escapeHtmlForPdf(period)}</div>
        <div><strong>평균 Q1 이해도</strong> ${formatScore(stats.avgQ1)} · <strong>평균 Q2 성장 체감</strong> ${formatScore(stats.avgQ2)}</div>
      </div>
    </div>`);
}

function buildUnderstandingSection(stats: VocReportStats): string {
  return pdfSection(`
    <div style="padding:18px 20px;background:#eff6ff;border-radius:12px;border:2px solid #93c5fd;">
      <div style="font-size:13px;font-weight:900;color:#1d4ed8;margin-bottom:8px;">2. 이해도 분석 (Q1)</div>
      <div style="font-size:24px;font-weight:900;color:#1e3a8a;margin-bottom:12px;">${formatScore(stats.avgQ1)}</div>
      <div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:8px;">분포</div>
      ${buildRatingDistributionRows(stats.q1Distribution, stats.totalCount)}
    </div>`);
}

function buildGrowthSection(stats: VocReportStats): string {
  return pdfSection(`
    <div style="padding:18px 20px;background:#faf5ff;border-radius:12px;border:2px solid #d8b4fe;">
      <div style="font-size:13px;font-weight:900;color:#7e22ce;margin-bottom:8px;">3. 성장 체감 분석 (Q2)</div>
      <div style="font-size:24px;font-weight:900;color:#581c87;margin-bottom:12px;">${formatScore(stats.avgQ2)}</div>
      <div style="font-size:12px;font-weight:700;color:#7e22ce;margin-bottom:8px;">Persona별 평균</div>
      ${buildPersonaAvgTable(stats.personaAvgQ2, stats.personaCounts)}
    </div>`);
}

function buildPainSection(stats: VocReportStats): string {
  const painItems =
    stats.painIntelligence.length > 0
      ? stats.painIntelligence.slice(0, 5).map((cat) => ({
          label: cat.label,
          count: cat.count,
        }))
      : stats.topPain.slice(0, 5);

  return pdfSection(`
    <div style="padding:18px 20px;background:#fffbeb;border-radius:12px;border:2px solid #fcd34d;">
      <div style="font-size:13px;font-weight:900;color:#b45309;margin-bottom:8px;">4. Pain Intelligence · TOP 5</div>
      ${buildRankedList(painItems, "아직 Pain 데이터가 없습니다.")}
    </div>`);
}

function buildRequestSection(stats: VocReportStats): string {
  const requestItems =
    stats.requestIntelligence.length > 0
      ? stats.requestIntelligence.slice(0, 5).map((cat) => ({
          label: cat.label,
          count: cat.count,
        }))
      : stats.topRequest.slice(0, 5);

  return pdfSection(`
    <div style="padding:18px 20px;background:#ecfdf5;border-radius:12px;border:2px solid #6ee7b7;">
      <div style="font-size:13px;font-weight:900;color:#047857;margin-bottom:8px;">5. Request Intelligence · TOP 5</div>
      ${buildRankedList(requestItems, "아직 Request 데이터가 없습니다.")}
    </div>`);
}

function buildRecommendSection(stats: VocReportStats): string {
  return pdfSection(`
    <div style="padding:18px 20px;background:#f8fafc;border-radius:12px;border:2px solid #cbd5e1;">
      <div style="font-size:13px;font-weight:900;color:#334155;margin-bottom:8px;">6. 추천 의향</div>
      ${buildNpsBar(stats)}
    </div>`);
}

function buildPmRecommendationSection(stats: VocReportStats): string {
  const rows = stats.pmRecommendations
    .map(
      (rec) =>
        `<div style="margin-bottom:10px;padding:12px 14px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="font-size:12px;font-weight:800;color:#7c3aed;">Priority ${rec.priority}</div>
          <div style="font-size:15px;font-weight:900;color:#0f172a;margin-top:4px;">${escapeHtmlForPdf(rec.title)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;line-height:1.6;">${escapeHtmlForPdf(rec.rationale)}</div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#fdf4ff;border-radius:12px;border:2px solid #e9d5ff;">
      <div style="font-size:13px;font-weight:900;color:#86198f;margin-bottom:8px;">7. PM Recommendation</div>
      ${rows || `<div style="font-size:13px;color:#64748b;">추천 항목을 생성할 데이터가 부족합니다.</div>`}
    </div>`);
}

/** I-2.5 — VOC Report PDF sections */
export function buildVocReportPdfSections(input: VocReportPdfSectionsInput): string {
  const { stats } = input;
  return [
    buildGateBanner(stats),
    buildExecutiveSummarySection(input),
    buildUnderstandingSection(stats),
    buildGrowthSection(stats),
    buildPainSection(stats),
    buildRequestSection(stats),
    buildRecommendSection(stats),
    buildPmRecommendationSection(stats),
  ]
    .filter(Boolean)
    .join("");
}
