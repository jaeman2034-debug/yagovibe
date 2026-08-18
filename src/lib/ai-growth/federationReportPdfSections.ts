import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type { FederationCoachBenchmarkResult } from "@/lib/ai-growth/federationCoachBenchmarkTypes";
import type { FederationDashboardResult } from "@/lib/ai-growth/federationDashboardTypes";
import type { FederationOperationsBenchmarkResult } from "@/lib/ai-growth/federationOperationsBenchmarkTypes";
import type { FederationRiskIntelligenceResult } from "@/lib/ai-growth/federationRiskIntelligenceTypes";

function formatPct(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value}%` : "—";
}

function formatSignedDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** Sprint H-1.5 — Federation Dashboard PDF 블록 */
export function buildFederationDashboardPdfSection(
  dashboard: FederationDashboardResult | null | undefined
): string {
  if (!dashboard) return "";

  const { kpi, federations, isEmpty } = dashboard;

  if (isEmpty) {
    return pdfSection(`
      <div style="padding:18px 20px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;">
        <div style="font-size:13px;font-weight:900;color:#5b21b6;margin-bottom:8px;">Federation Dashboard</div>
        <div style="font-size:13px;line-height:1.7;color:#6d28d9;">다중 연맹 비교 데이터 대기 중</div>
      </div>`);
  }

  const rows = federations
    .map(
      (federation) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #ddd6fe;">
          <div style="font-size:13px;font-weight:800;color:#4c1d95;">${escapeHtmlForPdf(federation.federationName)}</div>
          <div style="font-size:12px;color:#6d28d9;margin-top:3px;">
            아카데미 ${federation.academyCount} · 선수 ${federation.playerCount} · OVR ${federation.avgOvr ?? "—"} · 성장 ${formatSignedDelta(federation.avgGrowthRate)} · 위험 ${federation.atRiskPlayerCount}명
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;">
      <div style="font-size:13px;font-weight:900;color:#5b21b6;margin-bottom:8px;">Federation Dashboard</div>
      <div style="font-size:14px;line-height:1.8;color:#6d28d9;margin-bottom:10px;">
        <div><strong>연맹</strong> ${kpi.federationCount} · <strong>아카데미</strong> ${kpi.academyCount} · <strong>소속 선수</strong> ${kpi.playerCount}</div>
        <div><strong>평균 OVR</strong> ${kpi.avgOvr ?? "—"} · <strong>평균 성장률</strong> ${formatSignedDelta(kpi.avgGrowthRate)} · <strong>위험 선수</strong> ${kpi.atRiskPlayerCount}</div>
      </div>
      ${rows}
    </div>`);
}

/** Sprint H-1.5 — Federation Risk Intelligence PDF 블록 */
export function buildFederationRiskPdfSection(
  intelligence: FederationRiskIntelligenceResult | null | undefined
): string {
  if (!intelligence) return "";

  const { kpi, federations, digest } = intelligence;

  const rows = federations
    .map(
      (federation) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #fecdd3;">
          <div style="font-size:13px;font-weight:800;color:#9f1239;">${escapeHtmlForPdf(federation.federationName)}</div>
          <div style="font-size:12px;color:#be123c;margin-top:3px;">
            위험 ${formatPct(federation.atRiskPlayerPct)} · 저출석 ${formatPct(federation.lowAttendanceSessionPct)} · 미기록 ${formatPct(federation.unrecordedSessionPct)}
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#fff1f2;border-radius:12px;border:2px solid #fda4af;">
      <div style="font-size:13px;font-weight:900;color:#9f1239;margin-bottom:8px;">Federation Risk Intelligence</div>
      <div style="font-size:14px;line-height:1.8;color:#be123c;margin-bottom:10px;">
        <div><strong>평균 위험 선수</strong> ${formatPct(kpi.avgAtRiskPlayerPct)} · <strong>저출석</strong> ${formatPct(kpi.avgLowAttendanceSessionPct)} · <strong>미기록</strong> ${formatPct(kpi.avgUnrecordedSessionPct)}</div>
      </div>
      <div style="font-size:13px;color:#be123c;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${rows}
    </div>`);
}

/** Sprint H-1.5 — Federation Coach Benchmark PDF 블록 */
export function buildFederationCoachBenchmarkPdfSection(
  benchmark: FederationCoachBenchmarkResult | null | undefined
): string {
  if (!benchmark) return "";

  const { kpi, federations, digest } = benchmark;

  const rows = federations
    .map(
      (federation) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #a7f3d0;">
          <div style="font-size:13px;font-weight:800;color:#065f46;">${escapeHtmlForPdf(federation.federationName)}</div>
          <div style="font-size:12px;color:#047857;margin-top:3px;">
            코치 ${federation.coachCount} · 세션 ${federation.activeSessionCount} · 출석 기록 ${formatPct(federation.attendanceRecordingRate)} · 성장 ${formatSignedDelta(federation.growthContributionRate)}
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#ecfdf5;border-radius:12px;border:2px solid #6ee7b7;">
      <div style="font-size:13px;font-weight:900;color:#065f46;margin-bottom:8px;">Federation Coach Benchmark</div>
      <div style="font-size:14px;line-height:1.8;color:#047857;margin-bottom:10px;">
        <div><strong>코치</strong> ${kpi.totalCoachCount} · <strong>활성 세션</strong> ${kpi.totalActiveSessions} · <strong>출석 기록률</strong> ${formatPct(kpi.avgAttendanceRecordingRate)}</div>
        <div><strong>성장 기여</strong> ${formatSignedDelta(kpi.avgGrowthContributionRate)} · <strong>위험 개선</strong> ${formatPct(kpi.avgAtRiskImprovementRate)}</div>
      </div>
      <div style="font-size:13px;color:#047857;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${rows}
    </div>`);
}

/** Sprint H-1.5 — Federation Operations Benchmark PDF 블록 */
export function buildFederationOperationsBenchmarkPdfSection(
  benchmark: FederationOperationsBenchmarkResult | null | undefined
): string {
  if (!benchmark) return "";

  const { kpi, federations, digest } = benchmark;

  const rows = federations
    .map(
      (federation) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #a5f3fc;">
          <div style="font-size:13px;font-weight:800;color:#0e7490;">#${federation.rank} ${escapeHtmlForPdf(federation.federationName)}${federation.operationalHealthScore !== null ? ` · ${federation.operationalHealthScore}점` : ""}</div>
          <div style="font-size:12px;color:#0891b2;margin-top:3px;">
            출석 ${formatPct(federation.attendanceRatePct)} · 운영 ${formatPct(federation.sessionOperationRate)} · 미기록 ${formatPct(federation.unrecordedRatePct)} · 위험 ${formatPct(federation.atRiskPlayerPct)}
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#ecfeff;border-radius:12px;border:2px solid #67e8f9;">
      <div style="font-size:13px;font-weight:900;color:#0e7490;margin-bottom:8px;">Federation Operations Benchmark</div>
      <div style="font-size:14px;line-height:1.8;color:#0891b2;margin-bottom:10px;">
        <div><strong>출석률</strong> ${formatPct(kpi.avgAttendanceRatePct)} · <strong>세션 운영률</strong> ${formatPct(kpi.avgSessionOperationRate)} · <strong>미기록률</strong> ${formatPct(kpi.avgUnrecordedRatePct)}</div>
        <div><strong>위험 선수</strong> ${formatPct(kpi.avgAtRiskPlayerPct)} · <strong>건전성</strong> ${kpi.avgOperationalHealthScore ?? "—"}점</div>
      </div>
      <div style="font-size:13px;color:#0891b2;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${rows}
    </div>`);
}

/** Sprint H-1.5 — AI Federation Summary PDF 블록 */
export function buildFederationAiSummaryPdfSection(input: {
  dashboard: FederationDashboardResult | null | undefined;
  riskIntelligence: FederationRiskIntelligenceResult | null | undefined;
  coachBenchmark: FederationCoachBenchmarkResult | null | undefined;
  operationsBenchmark: FederationOperationsBenchmarkResult | null | undefined;
}): string {
  const paragraphs: string[] = [];

  if (input.dashboard && !input.dashboard.isEmpty) {
    const kpi = input.dashboard.kpi;
    paragraphs.push(
      `${kpi.federationCount}개 연맹을 관리 중이며, ${kpi.academyCount}개 아카데미 · ${kpi.playerCount}명의 선수를 통합 운영하고 있습니다.`,
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
        <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:8px;">AI Federation Summary</div>
        <div style="font-size:13px;line-height:1.7;color:#312e81;">연맹 데이터가 쌓이면 AI 통합 요약이 생성됩니다.</div>
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
      <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:12px;">AI Federation Summary</div>
      ${body}
    </div>`);
}

export type FederationReportPdfSectionsInput = {
  dashboard: FederationDashboardResult | null;
  riskIntelligence: FederationRiskIntelligenceResult | null;
  coachBenchmark: FederationCoachBenchmarkResult | null;
  operationsBenchmark: FederationOperationsBenchmarkResult | null;
};

/** Sprint H-1.5 — Federation PDF 섹션 조립 */
export function buildFederationReportPdfSections(
  input: FederationReportPdfSectionsInput
): string {
  return [
    buildFederationDashboardPdfSection(input.dashboard),
    buildFederationRiskPdfSection(input.riskIntelligence),
    buildFederationCoachBenchmarkPdfSection(input.coachBenchmark),
    buildFederationOperationsBenchmarkPdfSection(input.operationsBenchmark),
    buildFederationAiSummaryPdfSection(input),
  ]
    .filter(Boolean)
    .join("");
}
