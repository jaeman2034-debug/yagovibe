import { escapeHtmlForPdf, pdfSection } from "@/lib/ai-growth/renderHtmlToPdf";
import type { AcademyAttendanceIntelligenceResult } from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";
import type { AcademyCoachOperationsResult } from "@/lib/ai-growth/academyCoachOperationsTypes";
import type { AcademySessionIntelligenceResult } from "@/lib/ai-growth/academySessionIntelligenceTypes";

function formatPct(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value}%` : "—";
}

/** Sprint F-2.4 — 출석 인텔리전스 PDF 블록 */
export function buildAcademyAttendanceIntelligencePdfSection(
  intelligence: AcademyAttendanceIntelligenceResult | null | undefined
): string {
  if (!intelligence) return "";

  const { kpi, digest, isEmpty } = intelligence;

  if (isEmpty) {
    return pdfSection(`
      <div style="padding:18px 20px;background:#f0fdfa;border-radius:12px;border:2px solid #5eead4;">
        <div style="font-size:13px;font-weight:900;color:#0f766e;margin-bottom:8px;">출석 인텔리전스</div>
        <div style="font-size:13px;line-height:1.7;color:#115e59;">세션 출석을 기록하면 출석률 · 위험 선수 요약이 표시됩니다.</div>
      </div>`);
  }

  return pdfSection(`
    <div style="padding:18px 20px;background:#f0fdfa;border-radius:12px;border:2px solid #5eead4;">
      <div style="font-size:13px;font-weight:900;color:#0f766e;margin-bottom:8px;">출석 인텔리전스</div>
      <div style="font-size:14px;line-height:1.8;color:#115e59;margin-bottom:10px;">
        <div><strong>평균 출석률</strong> ${formatPct(kpi.avgAttendanceRatePct)} · <strong>지각률</strong> ${formatPct(kpi.avgLateRatePct)} · <strong>결석률</strong> ${formatPct(kpi.avgAbsentRatePct)}</div>
        <div><strong>위험 선수</strong> ${kpi.atRiskPlayerCount}명 · <strong>연속 결석</strong> ${kpi.consecutiveAbsencePlayerCount}명</div>
      </div>
      <div style="font-size:13px;line-height:1.65;color:#134e4a;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
    </div>`);
}

/** Sprint F-2.4 — 세션 인텔리전스 PDF 블록 */
export function buildAcademySessionIntelligencePdfSection(
  intelligence: AcademySessionIntelligenceResult | null | undefined
): string {
  if (!intelligence) return "";

  const { kpi, digest, recentSessions, isEmpty } = intelligence;

  if (isEmpty) {
    return pdfSection(`
      <div style="padding:18px 20px;background:#eff6ff;border-radius:12px;border:2px solid #93c5fd;">
        <div style="font-size:13px;font-weight:900;color:#1d4ed8;margin-bottom:8px;">세션 인텔리전스</div>
        <div style="font-size:13px;line-height:1.7;color:#1e40af;">훈련 세션을 생성하면 세션 운영 · 출석률 요약이 표시됩니다.</div>
      </div>`);
  }

  const sessionRows = recentSessions
    .slice(0, 5)
    .map(
      (session) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #bfdbfe;">
          <div style="font-size:13px;font-weight:800;color:#1e3a8a;">${escapeHtmlForPdf(session.title)}</div>
          <div style="font-size:12px;color:#2563eb;margin-top:3px;">${escapeHtmlForPdf(session.weekLabel)} · ${escapeHtmlForPdf(session.status)}${
            session.attendanceRatePct !== null
              ? ` · 출석률 ${session.attendanceRatePct}%`
              : " · 출석 미기록"
          }</div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#eff6ff;border-radius:12px;border:2px solid #93c5fd;">
      <div style="font-size:13px;font-weight:900;color:#1d4ed8;margin-bottom:8px;">세션 인텔리전스</div>
      <div style="font-size:14px;line-height:1.8;color:#1e40af;margin-bottom:10px;">
        <div><strong>최근 세션</strong> ${kpi.totalSessions} · <strong>평균 출석률</strong> ${formatPct(kpi.avgSessionAttendanceRatePct)}</div>
        <div><strong>저출석 세션</strong> ${kpi.lowAttendanceSessionCount} · <strong>출석 미기록</strong> ${kpi.unrecordedSessionCount}</div>
      </div>
      <div style="font-size:13px;line-height:1.65;color:#1e40af;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${sessionRows}
    </div>`);
}

/** Sprint F-2.4 — 코치 운영 인텔리전스 PDF 블록 */
export function buildAcademyCoachOperationsPdfSection(
  operations: AcademyCoachOperationsResult | null | undefined
): string {
  if (!operations) return "";

  const { kpi, coaches, digest, isEmpty } = operations;

  if (isEmpty) {
    return pdfSection(`
      <div style="padding:18px 20px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;">
        <div style="font-size:13px;font-weight:900;color:#6d28d9;margin-bottom:8px;">코치 운영 인텔리전스</div>
        <div style="font-size:13px;line-height:1.7;color:#5b21b6;">훈련 세션과 출석 기록 후 코치별 운영 KPI가 표시됩니다.</div>
      </div>`);
  }

  const coachRows = coaches
    .map(
      (coach) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #ddd6fe;">
          <div style="font-size:13px;font-weight:800;color:#5b21b6;">${escapeHtmlForPdf(coach.coachLabel)}</div>
          <div style="font-size:12px;color:#6d28d9;margin-top:3px;line-height:1.6;">
            세션 ${coach.sessionCount}회 · 출석 관리 ${coach.attendanceManagementRate}% · 위험 선수 ${coach.atRiskPlayerCount}명 · 위험 관리 ${coach.atRiskManagementRate}%
          </div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#f5f3ff;border-radius:12px;border:2px solid #c4b5fd;">
      <div style="font-size:13px;font-weight:900;color:#6d28d9;margin-bottom:8px;">코치 운영 인텔리전스</div>
      <div style="font-size:14px;line-height:1.8;color:#5b21b6;margin-bottom:10px;">
        <div><strong>운영 코치</strong> ${kpi.coachCount} · <strong>최근 세션</strong> ${kpi.totalSessions}</div>
        <div><strong>평균 출석 관리율</strong> ${kpi.avgAttendanceManagementRate}% · <strong>평균 위험 관리율</strong> ${kpi.avgAtRiskManagementRate}%</div>
      </div>
      <div style="font-size:13px;line-height:1.65;color:#5b21b6;margin-bottom:10px;">${escapeHtmlForPdf(digest.summaryLines.join(" · "))}</div>
      ${coachRows}
    </div>`);
}

export type AcademyOperationsRiskRow = {
  title: string;
  detail: string;
};

/** Sprint F-2.4 — 운영 위험 현황 집계 */
export function buildAcademyOperationsRiskRows(input: {
  attendance: AcademyAttendanceIntelligenceResult | null | undefined;
  session: AcademySessionIntelligenceResult | null | undefined;
  coachOperations: AcademyCoachOperationsResult | null | undefined;
}): AcademyOperationsRiskRow[] {
  const rows: AcademyOperationsRiskRow[] = [];

  for (const player of input.attendance?.atRiskPlayers ?? []) {
    rows.push({
      title: `${player.playerName} · 출석 위험`,
      detail: `${player.riskLabels.join(", ")} · 출석률 ${player.attendanceRatePct}%`,
    });
  }

  if ((input.session?.kpi.unrecordedSessionCount ?? 0) > 0) {
    rows.push({
      title: "출석 미기록 세션",
      detail: `${input.session!.kpi.unrecordedSessionCount}개 세션에 출석 기록이 없습니다.`,
    });
  }

  if ((input.session?.kpi.lowAttendanceSessionCount ?? 0) > 0) {
    rows.push({
      title: "저출석 세션",
      detail: `${input.session!.kpi.lowAttendanceSessionCount}개 세션의 출석률이 70% 미만입니다.`,
    });
  }

  for (const coach of input.coachOperations?.coaches ?? []) {
    if (coach.unrecordedSessionCount > 0) {
      rows.push({
        title: `${coach.coachLabel} · 출석 관리 공백`,
        detail: `미기록 세션 ${coach.unrecordedSessionCount}회 · 출석 관리율 ${coach.attendanceManagementRate}%`,
      });
    }
  }

  return rows;
}

/** Sprint F-2.4 — 운영 위험 현황 PDF 블록 */
export function buildAcademyOperationsRiskPdfSection(
  riskRows: AcademyOperationsRiskRow[]
): string {
  if (riskRows.length === 0) {
    return pdfSection(`
      <div style="padding:18px 20px;background:#fffbeb;border-radius:12px;border:2px solid #fcd34d;">
        <div style="font-size:13px;font-weight:900;color:#92400e;margin-bottom:8px;">운영 위험 현황</div>
        <div style="font-size:13px;line-height:1.7;color:#b45309;">현재 운영 위험 항목이 없습니다.</div>
      </div>`);
  }

  const body = riskRows
    .map(
      (row) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #fcd34d;">
          <div style="font-size:13px;font-weight:800;color:#92400e;">${escapeHtmlForPdf(row.title)}</div>
          <div style="font-size:12px;color:#b45309;margin-top:3px;">${escapeHtmlForPdf(row.detail)}</div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#fffbeb;border-radius:12px;border:2px solid #fcd34d;">
      <div style="font-size:13px;font-weight:900;color:#92400e;margin-bottom:10px;">운영 위험 현황</div>
      ${body}
    </div>`);
}

export type AcademyOperationsActionRow = {
  title: string;
  detail: string;
};

/** Sprint F-2.4 — 운영 권장 액션 집계 */
export function buildAcademyOperationsActionRows(input: {
  attendance: AcademyAttendanceIntelligenceResult | null | undefined;
  session: AcademySessionIntelligenceResult | null | undefined;
  coachOperations: AcademyCoachOperationsResult | null | undefined;
}): AcademyOperationsActionRow[] {
  const rows: AcademyOperationsActionRow[] = [];
  const seen = new Set<string>();

  function push(title: string, detail: string) {
    const key = `${title}::${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ title, detail });
  }

  for (const player of input.attendance?.atRiskPlayers ?? []) {
    for (const action of player.recommendations) {
      push(action, `${player.playerName} · 출석률 ${player.attendanceRatePct}%`);
    }
  }

  if ((input.session?.kpi.unrecordedSessionCount ?? 0) > 0) {
    push(
      "출석 미기록 세션 기록",
      `${input.session!.kpi.unrecordedSessionCount}개 세션의 출석을 입력하세요.`
    );
  }

  if ((input.session?.kpi.lowAttendanceSessionCount ?? 0) > 0) {
    push(
      "저출석 세션 점검",
      `${input.session!.kpi.lowAttendanceSessionCount}개 세션의 출석률을 확인하고 후속 조치를 진행하세요.`
    );
  }

  for (const coach of input.coachOperations?.coaches ?? []) {
    if (coach.atRiskPlayerCount > 0 && coach.atRiskManagementRate < 100) {
      push(
        `${coach.coachLabel} 위험 선수 관리`,
        `위험 선수 ${coach.atRiskPlayerCount}명 · 관리율 ${coach.atRiskManagementRate}%`
      );
    }
    if (coach.unrecordedSessionCount > 0) {
      push(
        `${coach.coachLabel} 출석 관리`,
        `미기록 세션 ${coach.unrecordedSessionCount}회를 우선 기록하세요.`
      );
    }
  }

  if (input.attendance?.digest.guardianFollowUpNeeded) {
    push("보호자 확인", "출석 위험 선수에 대해 보호자 연락을 진행하세요.");
  }

  return rows;
}

/** Sprint F-2.4 — 운영 권장 액션 PDF 블록 */
export function buildAcademyOperationsActionsPdfSection(
  actionRows: AcademyOperationsActionRow[]
): string {
  if (actionRows.length === 0) {
    return pdfSection(`
      <div style="padding:18px 20px;background:#e0f2fe;border-radius:12px;border:2px solid #7dd3fc;">
        <div style="font-size:13px;font-weight:900;color:#0c4a6e;margin-bottom:8px;">운영 권장 액션</div>
        <div style="font-size:13px;line-height:1.7;color:#0369a1;">현재 우선 운영 액션이 없습니다.</div>
      </div>`);
  }

  const body = actionRows
    .map(
      (row) =>
        `<div style="margin-bottom:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #bae6fd;">
          <div style="font-size:13px;font-weight:800;color:#0c4a6e;">${escapeHtmlForPdf(row.title)}</div>
          <div style="font-size:12px;color:#0369a1;margin-top:3px;">${escapeHtmlForPdf(row.detail)}</div>
        </div>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:18px 20px;background:#e0f2fe;border-radius:12px;border:2px solid #7dd3fc;">
      <div style="font-size:13px;font-weight:900;color:#0c4a6e;margin-bottom:10px;">운영 권장 액션</div>
      ${body}
    </div>`);
}

/** Sprint F-2.4 — AI 운영 요약 PDF 블록 */
export function buildAcademyOperationsAiSummaryPdfSection(input: {
  attendance: AcademyAttendanceIntelligenceResult | null | undefined;
  session: AcademySessionIntelligenceResult | null | undefined;
  coachOperations: AcademyCoachOperationsResult | null | undefined;
}): string {
  const paragraphs = [
    ...(input.attendance?.aiSummary.paragraphs ?? []),
    ...(input.session?.aiSummary.paragraphs ?? []),
    ...(input.coachOperations?.aiSummary.paragraphs ?? []),
  ].filter((paragraph, index, arr) => arr.indexOf(paragraph) === index);

  if (paragraphs.length === 0) {
    return pdfSection(`
      <div style="padding:20px 22px;background:#ede9fe;border-radius:12px;border:2px solid #a78bfa;">
        <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:8px;">AI 운영 요약</div>
        <div style="font-size:13px;line-height:1.7;color:#312e81;">세션·출석 데이터가 쌓이면 AI 운영 요약이 생성됩니다.</div>
      </div>`);
  }

  const body = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#312e81;">${escapeHtmlForPdf(paragraph)}</p>`
    )
    .join("");

  return pdfSection(`
    <div style="padding:20px 22px;background:#ede9fe;border-radius:12px;border:2px solid #a78bfa;">
      <div style="font-size:14px;font-weight:900;color:#5b21b6;margin-bottom:12px;">AI 운영 요약</div>
      ${body}
    </div>`);
}

export type AcademyOperationsReportPdfSectionsInput = {
  academyAttendanceIntelligence: AcademyAttendanceIntelligenceResult | null;
  academySessionIntelligence: AcademySessionIntelligenceResult | null;
  academyCoachOperations: AcademyCoachOperationsResult | null;
};

/** Sprint F-2.4 — 아카데미 운영 PDF 섹션 조립 */
export function buildAcademyOperationsReportPdfSections(
  input: AcademyOperationsReportPdfSectionsInput
): string {
  const riskRows = buildAcademyOperationsRiskRows({
    attendance: input.academyAttendanceIntelligence,
    session: input.academySessionIntelligence,
    coachOperations: input.academyCoachOperations,
  });
  const actionRows = buildAcademyOperationsActionRows({
    attendance: input.academyAttendanceIntelligence,
    session: input.academySessionIntelligence,
    coachOperations: input.academyCoachOperations,
  });

  return [
    buildAcademyAttendanceIntelligencePdfSection(input.academyAttendanceIntelligence),
    buildAcademySessionIntelligencePdfSection(input.academySessionIntelligence),
    buildAcademyCoachOperationsPdfSection(input.academyCoachOperations),
    buildAcademyOperationsRiskPdfSection(riskRows),
    buildAcademyOperationsActionsPdfSection(actionRows),
    buildAcademyOperationsAiSummaryPdfSection({
      attendance: input.academyAttendanceIntelligence,
      session: input.academySessionIntelligence,
      coachOperations: input.academyCoachOperations,
    }),
  ]
    .filter(Boolean)
    .join("");
}
