/**
 * 월간 회계 PDF용 HTML (Puppeteer → PDF) — 클라이언트 리포트와 동일한 지원금 블록 구조.
 */

export type SubsidyReportPayload = {
  filterLabel: string;
  paidIn: number;
  restrictedExpense: number;
  balance: number;
  usagePct: number | null;
  auditStatus: "ok" | "unlinked";
  purposeRows: Array<{ label: string; amount: number }>;
  expenseRows: Array<{
    occurredAt: string;
    fundPurpose: string;
    categoryLabel: string;
    amount: number;
    linkedCaption: string;
    memo: string;
  }>;
  unlinkedRows: Array<{ occurredAt: string; amount: number; memo: string }>;
  incomeRows: Array<{
    occurredAt: string;
    fundSource: string;
    fundPurpose: string;
    amount: number;
    statusLabel: string;
    ledgerIdShort: string;
  }>;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatReportWon(value: number): string {
  const n = Math.max(0, Math.floor(value));
  return `${n.toLocaleString("ko-KR")}원`;
}

export const MONTHLY_REPORT_PRINT_STYLES = `
  body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif; margin: 24px; color: #111827; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  h2 { font-size: 15px; margin: 16px 0 8px; }
  h3 { font-size: 14px; margin: 12px 0 6px; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 12px 0; }
  @media (min-width: 640px) { .cards { grid-template-columns: repeat(4, 1fr); } }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
  .card .lbl { font-size: 11px; color: #6b7280; }
  .card .val { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; vertical-align: top; }
  th { background: #f9fafb; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #6b7280; font-size: 11px; }
  .slug { font-size: 11px; color: #9ca3af; }
  .subsidy-section { border-top: 2px solid #7c3aed; padding-top: 14px; margin-top: 16px; }
  .sr-title { color: #5b21b6; font-size: 16px; margin: 0 0 6px; }
  .sr-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; margin-left: 6px; }
  .sr-badge-ok { background: #d1fae5; color: #065f46; }
  .sr-badge-warn { background: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; }
  .sr-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 10px 0 14px; }
  @media (min-width: 640px) { .sr-summary { grid-template-columns: repeat(4, 1fr); } }
  .sr-sum-card { border: 1px solid #e9d5ff; border-radius: 8px; padding: 8px 10px; background: #faf5ff; }
  .sr-sum-card .lbl { font-size: 10px; color: #6b21a8; margin-bottom: 2px; }
  .sr-sum-card .val { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .sr-warn-box { background: #faf5ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 10px; margin: 10px 0; }
  .sr-warn-title { font-weight: 700; color: #5b21b6; font-size: 12px; margin-bottom: 6px; }
  .sr-foot { font-size: 10px; color: #6b7280; margin-top: 10px; line-height: 1.45; }
`;

function renderSubsidySectionInner(s: SubsidyReportPayload): string {
  const pct = s.usagePct != null && Number.isFinite(s.usagePct) ? `${s.usagePct}%` : "—";
  const badge =
    s.auditStatus === "unlinked"
      ? `<span class="sr-badge sr-badge-warn">미연결 지출 있음</span>`
      : `<span class="sr-badge sr-badge-ok">정상</span>`;

  const purposeBody =
    s.purposeRows.length > 0
      ? s.purposeRows
          .map(
            (r) => `
      <tr><td>${escapeHtml(r.label)}</td><td class="num">${escapeHtml(formatReportWon(r.amount))}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="2" class="muted">해당 구간에 지원금 지출이 없습니다.</td></tr>`;

  const expenseBody =
    s.expenseRows.length > 0
      ? s.expenseRows
          .map(
            (r) => `
      <tr>
        <td>${escapeHtml((r.occurredAt || "").slice(0, 10))}</td>
        <td>${escapeHtml(r.fundPurpose)}</td>
        <td>${escapeHtml(r.categoryLabel)}</td>
        <td class="num">${escapeHtml(formatReportWon(r.amount))}</td>
        <td>${escapeHtml(r.linkedCaption)}</td>
        <td>${escapeHtml(r.memo)}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="muted">해당 구간에 지원금 지출이 없습니다.</td></tr>`;

  const unlinkedBlock =
    s.unlinkedRows.length > 0
      ? `
    <div class="sr-warn-box">
      <div class="sr-warn-title">연결되지 않은 지원금 지출</div>
      <p class="muted" style="margin:0 0 6px;font-size:11px">입금 완료 지원금 수입 원장과 연결되지 않은 지출입니다.</p>
      <table>
        <thead><tr><th>날짜</th><th class="num">금액</th><th>비고·재원</th></tr></thead>
        <tbody>
          ${s.unlinkedRows
            .map(
              (r) => `
          <tr>
            <td>${escapeHtml((r.occurredAt || "").slice(0, 10))}</td>
            <td class="num">${escapeHtml(formatReportWon(r.amount))}</td>
            <td>${escapeHtml(r.memo)}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`
      : "";

  const incomeBody =
    s.incomeRows.length > 0
      ? s.incomeRows
          .map(
            (r) => `
      <tr>
        <td>${escapeHtml((r.occurredAt || "").slice(0, 10))}</td>
        <td>${escapeHtml(r.fundSource)}</td>
        <td>${escapeHtml(r.fundPurpose)}</td>
        <td class="num">${escapeHtml(formatReportWon(r.amount))}</td>
        <td>${escapeHtml(r.statusLabel)}</td>
        <td><code style="font-size:9px">${escapeHtml(r.ledgerIdShort)}</code></td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="muted">해당 구간에 관 지원금 수입 원장이 없습니다.</td></tr>`;

  return `
    <div class="section subsidy-section">
      <h2 class="sr-title">지원금 회계 보고서 (restricted_fund) ${badge}</h2>
      <p class="muted" style="margin:0 0 4px">기간·범위: ${escapeHtml(s.filterLabel)}</p>
      <p class="muted" style="margin:0;font-size:10px">일반 회계와 분리된 지원금 전용 원장(ledgerDomain: restricted_fund) 기준.</p>
      <div class="sr-summary">
        <div class="sr-sum-card"><div class="lbl">지원금 수입(입금 완료)</div><div class="val">${escapeHtml(formatReportWon(s.paidIn))}</div></div>
        <div class="sr-sum-card"><div class="lbl">지원금 사용(지출)</div><div class="val">${escapeHtml(formatReportWon(s.restrictedExpense))}</div></div>
        <div class="sr-sum-card"><div class="lbl">남은 지원금</div><div class="val">${escapeHtml(formatReportWon(s.balance))}</div></div>
        <div class="sr-sum-card"><div class="lbl">집행률</div><div class="val">${escapeHtml(pct)}</div></div>
      </div>
      <h3>용도별 지원금 지출 (fundPurpose)</h3>
      <table><thead><tr><th>용도</th><th class="num">금액</th></tr></thead><tbody>${purposeBody}</tbody></table>
      <h3>지원금 지출 내역</h3>
      <table>
        <thead><tr><th>날짜</th><th>용도</th><th>분류</th><th class="num">금액</th><th>연결 수입</th><th>비고</th></tr></thead>
        <tbody>${expenseBody}</tbody>
      </table>
      ${unlinkedBlock}
      <h3>관 지원금 수입 내역</h3>
      <table>
        <thead><tr><th>기준일</th><th>지원·재원</th><th>기금 용도</th><th class="num">금액</th><th>상태</th><th>원장 ID</th></tr></thead>
        <tbody>${incomeBody}</tbody>
      </table>
      <p class="sr-foot">자동 생성본입니다. 원장 스캔 한도(최대 2500건) 내 데이터만 반영됩니다.</p>
    </div>
  `;
}

export function buildSubsidyOnlyMonthlyReportHtml(input: {
  federationName: string;
  federationSlug: string;
  generatedAtIso: string;
  ledgerNote?: string;
  subsidy: SubsidyReportPayload;
}): string {
  const genLocal = new Date(input.generatedAtIso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  const note = input.ledgerNote?.trim()
    ? `<p class="muted" style="margin-top:6px">${escapeHtml(input.ledgerNote.trim())}</p>`
    : "";
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><style>${MONTHLY_REPORT_PRINT_STYLES}</style></head><body>
    <div class="section">
      <h1>${escapeHtml(input.federationName)} — 지원금 회계 보고서</h1>
      <p class="slug">slug: ${escapeHtml(input.federationSlug)}</p>
      <p class="muted">문서: 지원금 전용 (restricted_fund)</p>
      <p class="muted">생성 시각: ${escapeHtml(genLocal)}</p>
      ${note}
    </div>
    ${renderSubsidySectionInner(input.subsidy)}
  </body></html>`;
}

export function buildFullMonthlyAccountingReportHtml(input: {
  federationName: string;
  federationSlug: string;
  generatedAtIso: string;
  filterLabel: string;
  ledgerNote?: string;
  generalIncomePaid: number;
  generalReceivable: number;
  generalExpense: number;
  generalBalance: number;
  restrictedPaidIn: number;
  restrictedExpense: number;
  restrictedBalance: number;
  generalRows: Array<{ date: string; kind: string; category: string; amount: number; memo: string }>;
}): string {
  const genLocal = new Date(input.generatedAtIso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  const note = input.ledgerNote?.trim()
    ? `<p class="muted" style="margin-top:6px">${escapeHtml(input.ledgerNote.trim())}</p>`
    : "";
  const tbody =
    input.generalRows.length > 0
      ? input.generalRows
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.kind)}</td><td>${escapeHtml(r.category)}</td><td class="num">${escapeHtml(formatReportWon(r.amount))}</td><td>${escapeHtml(r.memo)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="muted">해당 월 일반 회계 원장이 없습니다.</td></tr>`;

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><style>${MONTHLY_REPORT_PRINT_STYLES}</style></head><body>
    <div class="section">
      <h1>${escapeHtml(input.federationName)} — 월간 회계 보고서 (일반)</h1>
      <p class="slug">slug: ${escapeHtml(input.federationSlug)}</p>
      <p class="muted">기간: ${escapeHtml(input.filterLabel)}</p>
      <p class="muted">생성 시각: ${escapeHtml(genLocal)}</p>
      ${note}
    </div>
    <div class="section">
      <h2>일반 회계 요약 (해당 월)</h2>
      <div class="cards">
        <div class="card"><div class="lbl">입금 완료 수입</div><div class="val">${escapeHtml(formatReportWon(input.generalIncomePaid))}</div></div>
        <div class="card"><div class="lbl">미수금(수동 예정·대기)</div><div class="val">${escapeHtml(formatReportWon(input.generalReceivable))}</div></div>
        <div class="card"><div class="lbl">지출</div><div class="val">${escapeHtml(formatReportWon(input.generalExpense))}</div></div>
        <div class="card"><div class="lbl">잔액(입금완료−지출)</div><div class="val">${escapeHtml(formatReportWon(input.generalBalance))}</div></div>
      </div>
    </div>
    <div class="section">
      <h2>지원금 회계 요약 (동일 월 · restricted_fund)</h2>
      <p class="muted" style="margin-bottom:8px">상세 내역·감사 표는 「지원금 전용」 PDF 파일을 참고하세요.</p>
      <div class="cards">
        <div class="card"><div class="lbl">지원금 입금 완료</div><div class="val">${escapeHtml(formatReportWon(input.restrictedPaidIn))}</div></div>
        <div class="card"><div class="lbl">지원금 지출</div><div class="val">${escapeHtml(formatReportWon(input.restrictedExpense))}</div></div>
        <div class="card"><div class="lbl">남은 지원금</div><div class="val">${escapeHtml(formatReportWon(input.restrictedBalance))}</div></div>
      </div>
    </div>
    <div class="section">
      <h2>일반 회계 원장 (해당 월)</h2>
      <table>
        <thead><tr><th>날짜</th><th>구분</th><th>분류</th><th class="num">금액</th><th>비고</th></tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <p class="sr-foot">자동 생성본입니다. 원장은 occurredAt 기준 최대 2500건 스캔 후 해당 월만 필터링했습니다.</p>
  </body></html>`;
}
