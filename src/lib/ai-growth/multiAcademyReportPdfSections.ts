import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type { MultiAcademyCoachBenchmarkResult } from "@/lib/ai-growth/multiAcademyCoachBenchmarkTypes";
import type { MultiAcademyDashboardResult } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import type { MultiAcademyOperationsBenchmarkResult } from "@/lib/ai-growth/multiAcademyOperationsBenchmarkTypes";
import type { MultiAcademyRiskIntelligenceResult } from "@/lib/ai-growth/multiAcademyRiskIntelligenceTypes";

function formatPct(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value}%` : "—";
}

function formatSignedDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** Sprint G-1.6 — Multi Academy Dashboard PDF 블록 */
export function buildMultiAcademyDashboardPdfSection(
  dashboard: MultiAcademyDashboardResult | null | undefined
): string {
  if (!dashboard) return "";

  const { kpi, academies, isEmpty } = dashboard;

  if (isEmpty) {
    return pdfSection(`
      <div style="padding:18px 20px;background:#eef2ff;border-radius:12px;border:2px solid #a5b4fc;">
        <div style="font-size:13px;font-weight:900;color:#3730a3;margin-bottom:8px;">Multi Academy Dashboard</div>
        <div style="font-size:13px;line-height:1.7;color:#4338ca;">다중 아카데미 비교 데이터 대기 중</div>
      </div>`);
  }

  const rows = academies
    .map(
      (academy) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #c7d2fe;">
          <div style="font-size:13px;font-weight:800;color:#312e81;">${escapeHtmlForPdf(academy.teamName)}</div>
          <div style="font-size:12px;color:#4338ca;margin-top:3px;">
            선수 ${academy.playerCount} · OVR ${academy.avgOvr ?? "—"} · 성장 ${formatSignedDelta(academy.avgGrowthRate)} · 위험 ${academy.atRiskPlayerCount}명
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#eef2ff;border-radius:12px;border:2px solid #a5b4fc;">
      <div style="font-size:13px;font-weight:900;color:#3730a3;margin-bottom:8px;">Multi Academy Dashboard</div>
      <div style="font-size:14px;line-height:1.8;color:#4338ca;margin-bottom:10px;">
        <div><strong>아카데미</strong> ${kpi.academyCount} · <strong>총 선수</strong> ${kpi.playerCount} · <strong>평균 OVR</strong> ${kpi.avgOvr ?? "—"}</div>
        <div><strong>평균 성장률</strong> ${formatSignedDelta(kpi.avgGrowthRate)} · <strong>위험 선수</strong> ${kpi.atRiskPlayerCount} · <strong>활성 코치</strong> ${kpi.activeCoachCount}</div>
      </div>
      ${rows}
    </div>`);
}

/** Sprint G-1.6 — Risk Intelligence PDF 블록 */
export function buildMultiAcademyRiskPdfSection(
  intelligence: MultiAcademyRiskIntelligenceResult | null | undefined
): string {
  if (!intelligence) return "";

  const { kpi, academies, digest } = intelligence;

  const rows = academies
    .map(
      (academy) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #fecdd3;">
          <div style="font-size:13px;font-weight:800;color:#9f1239;">${escapeHtmlForPdf(academy.teamName)}</div>
          <div style="font-size:12px;color:#be123c;margin-top:3px;">
            위험 ${formatPct(academy.atRiskPlayerPct)} · 저출석 ${formatPct(academy.lowAttendanceSessionPct)} · 미기록 ${formatPct(academy.unrecordedSessionPct)}
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#fff1f2;border-radius:12px;border:2px solid #fda4af;">
      <div style="font-size:13px;font-weight:900;color:#9f1239;margin-bottom:8px;">Risk Intelligence</div>
      <div style="font-size:14px;line-height:1.8;color:#be123c;margin-bottom:10px;">
        <div><strong>평균 위험 선수</strong> ${formatPct(kpi.avgAtRiskPlayerPct)} · <strong>저출석</strong> ${formatPct(kpi.avgLowAttendanceSessionPct)} · <strong>미기록</strong> ${formatPct(kpi.avgUnrecordedSessionPct)}</div>
      </div>
      <div style="font-size:13px;color:#be123c;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${rows}
    </div>`);
}

/** Sprint G-1.6 — Coach Benchmark PDF 블록 */
export function buildMultiAcademyCoachBenchmarkPdfSection(
  benchmark: MultiAcademyCoachBenchmarkResult | null | undefined
): string {
  if (!benchmark) return "";

  const { kpi, academies, digest } = benchmark;

  const rows = academies
    .map(
      (academy) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #a7f3d0;">
          <div style="font-size:13px;font-weight:800;color:#065f46;">${escapeHtmlForPdf(academy.teamName)}</div>
          <div style="font-size:12px;color:#047857;margin-top:3px;">
            코치 ${academy.coachCount} · 세션 ${academy.activeSessionCount} · 출석 기록 ${formatPct(academy.attendanceRecordingRate)} · 성장 ${formatSignedDelta(academy.growthContributionRate)}
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#ecfdf5;border-radius:12px;border:2px solid #6ee7b7;">
      <div style="font-size:13px;font-weight:900;color:#065f46;margin-bottom:8px;">Coach Benchmark</div>
      <div style="font-size:14px;line-height:1.8;color:#047857;margin-bottom:10px;">
        <div><strong>코치</strong> ${kpi.totalCoachCount} · <strong>활성 세션</strong> ${kpi.totalActiveSessions} · <strong>출석 기록률</strong> ${formatPct(kpi.avgAttendanceRecordingRate)}</div>
        <div><strong>성장 기여</strong> ${formatSignedDelta(kpi.avgGrowthContributionRate)} · <strong>위험 개선</strong> ${formatPct(kpi.avgAtRiskImprovementRate)}</div>
      </div>
      <div style="font-size:13px;color:#047857;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${rows}
    </div>`);
}

/** Sprint G-1.6 — Operations Benchmark PDF 블록 */
export function buildMultiAcademyOperationsBenchmarkPdfSection(
  benchmark: MultiAcademyOperationsBenchmarkResult | null | undefined
): string {
  if (!benchmark) return "";

  const { kpi, academies, digest } = benchmark;

  const rows = academies
    .map(
      (academy) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #a5f3fc;">
          <div style="font-size:13px;font-weight:800;color:#0e7490;">#${academy.rank} ${escapeHtmlForPdf(academy.teamName)}${academy.operationalHealthScore !== null ? ` · ${academy.operationalHealthScore}점` : ""}</div>
          <div style="font-size:12px;color:#0891b2;margin-top:3px;">
            출석 ${formatPct(academy.attendanceRatePct)} · 운영 ${formatPct(academy.sessionOperationRate)} · 미기록 ${formatPct(academy.unrecordedRatePct)} · 위험 ${formatPct(academy.atRiskPlayerPct)}
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#ecfeff;border-radius:12px;border:2px solid #67e8f9;">
      <div style="font-size:13px;font-weight:900;color:#0e7490;margin-bottom:8px;">Operations Benchmark</div>
      <div style="font-size:14px;line-height:1.8;color:#0891b2;margin-bottom:10px;">
        <div><strong>출석률</strong> ${formatPct(kpi.avgAttendanceRatePct)} · <strong>세션 운영률</strong> ${formatPct(kpi.avgSessionOperationRate)} · <strong>미기록률</strong> ${formatPct(kpi.avgUnrecordedRatePct)}</div>
        <div><strong>위험 선수</strong> ${formatPct(kpi.avgAtRiskPlayerPct)} · <strong>활성 코치</strong> ${formatPct(kpi.avgActiveCoachRatio)} · <strong>건전성</strong> ${kpi.avgOperationalHealthScore ?? "—"}점</div>
      </div>
      <div style="font-size:13px;color:#0891b2;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${rows}
    </div>`);
}

/** Sprint G-1.6 — AI Multi Academy Summary PDF 블록 */
export function buildMultiAcademyAiSummaryPdfSection(input: {
  dashboard: MultiAcademyDashboardResult | null | undefined;
  riskIntelligence: MultiAcademyRiskIntelligenceResult | null | undefined;
  coachBenchmark: MultiAcademyCoachBenchmarkResult | null | undefined;
  operationsBenchmark: MultiAcademyOperationsBenchmarkResult | null | undefined;
}): string {
  const paragraphs: string[] = [];

  if (input.dashboard && !input.dashboard.isEmpty) {
    const kpi = input.dashboard.kpi;
    paragraphs.push(
      `${kpi.academyCount}개 아카데미를 운영 중이며, 총 ${kpi.playerCount}명의 선수를 관리하고 있습니다.`,
      `평균 OVR ${kpi.avgOvr ?? "—"}, 평균 성장률 ${formatSignedDelta(kpi.avgGrowthRate)}, 위험 선수 ${kpi.atRiskPlayerCount}명입니다.`
    );
  }

  if (input.riskIntelligence?.digest.summaryLines.length) {
    paragraphs.push(`위험 인텔리전스: ${input.riskIntelligence.digest.summaryLines.join(" · ")}`);
  }
  if (input.coachBenchmark?.digest.summaryLines.length) {
    paragraphs.push(`코치 벤치마크: ${input.coachBenchmark.digest.summaryLines.join(" · ")}`);
  }
  if (input.operationsBenchmark?.digest.summaryLines.length) {
    paragraphs.push(`운영 벤치마크: ${input.operationsBenchmark.digest.summaryLines.join(" · ")}`);
  }

  const unique = paragraphs.filter((paragraph, index, arr) => arr.indexOf(paragraph) === index);

  if (unique.length === 0) {
    return pdfSection(`
      <div style="padding:20px 22px;background:#ede9fe;border-radius:12px;border:2px solid #a78bfa;">
        <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:8px;">AI Multi Academy Summary</div>
        <div style="font-size:13px;line-height:1.7;color:#312e81;">다중 아카데미 데이터가 쌓이면 AI 통합 요약이 생성됩니다.</div>
      </div>`);
  }

  const body = unique
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#312e81;">${escapeHtmlForPdf(paragraph)}</p>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:20px 22px;background:#ede9fe;border-radius:12px;border:2px solid #a78bfa;">
      <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:12px;">AI Multi Academy Summary</div>
      ${body}
    </div>`);
}

export type MultiAcademyReportPdfSectionsInput = {
  dashboard: MultiAcademyDashboardResult | null;
  riskIntelligence: MultiAcademyRiskIntelligenceResult | null;
  coachBenchmark: MultiAcademyCoachBenchmarkResult | null;
  operationsBenchmark: MultiAcademyOperationsBenchmarkResult | null;
};

/** Sprint G-1.6 — Multi Academy PDF 섹션 조립 */
export function buildMultiAcademyReportPdfSections(
  input: MultiAcademyReportPdfSectionsInput
): string {
  return [
    buildMultiAcademyDashboardPdfSection(input.dashboard),
    buildMultiAcademyRiskPdfSection(input.riskIntelligence),
    buildMultiAcademyCoachBenchmarkPdfSection(input.coachBenchmark),
    buildMultiAcademyOperationsBenchmarkPdfSection(input.operationsBenchmark),
    buildMultiAcademyAiSummaryPdfSection(input),
  ]
    .filter(Boolean)
    .join("");
}
