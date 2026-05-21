import type {
  FederationAccountingReportPrintProps,
  FederationSubsidyReportPrint,
} from "@/components/federation/accounting/FederationAccountingReportPrint";

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

const PRINT_STYLES = `
  body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif; margin: 24px; color: #111827; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  h2 { font-size: 15px; margin: 0; }
  h3 { font-size: 14px; margin: 0 0 10px; }
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
  .ai-box { border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 10px; padding: 12px; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f9fafb; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #6b7280; font-size: 12px; }
  .slug { font-size: 11px; color: #9ca3af; }
  .subsidy-page-break {
    page-break-before: always;
    break-before: page;
  }
  .subsidy-page-break .subsidy-section {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
  .subsidy-section { border-top: 2px solid #7c3aed; padding-top: 18px; margin-top: 20px; page-break-inside: avoid; }
  .sr-title { color: #5b21b6; font-size: 17px; margin: 0 0 6px; }
  .sr-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-left: 8px; vertical-align: middle; }
  .sr-badge-ok { background: #d1fae5; color: #065f46; }
  .sr-badge-warn { background: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; }
  .sr-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 12px 0 16px; }
  @media (min-width: 640px) { .sr-summary { grid-template-columns: repeat(4, 1fr); } }
  .sr-sum-card { border: 1px solid #e9d5ff; border-radius: 10px; padding: 10px 12px; background: #faf5ff; }
  .sr-sum-card .lbl { font-size: 11px; color: #6b21a8; margin-bottom: 4px; }
  .sr-sum-card .val { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .sr-warn-box { background: #faf5ff; border: 1px solid #c4b5fd; border-radius: 10px; padding: 12px; margin: 12px 0; }
  .sr-warn-title { font-weight: 700; color: #5b21b6; font-size: 13px; margin-bottom: 8px; }
  .sr-foot { font-size: 11px; color: #6b7280; margin-top: 12px; line-height: 1.5; }
  @media print {
    body { margin: 14px; }
    .no-print-hint { display: none; }
  }
`;

function renderSubsidyReportSection(s: FederationSubsidyReportPrint): string {
  const pct =
    s.usagePct != null && Number.isFinite(s.usagePct) ? `${s.usagePct}%` : "—";
  const badge =
    s.auditStatus === "unlinked"
      ? `<span class="sr-badge sr-badge-warn">미연결 지출 있음</span>`
      : `<span class="sr-badge sr-badge-ok">정상</span>`;

  const purposeBody =
    s.purposeRows.length > 0
      ? s.purposeRows
          .map(
            (r) => `
      <tr>
        <td>${escapeHtml(r.label)}</td>
        <td class="num">${escapeHtml(formatReportWon(r.amount))}</td>
      </tr>`
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
      <p class="muted" style="margin:0 0 8px;font-size:12px">아래 지출은 입금 완료된 지원금 수입 원장과 연결되지 않았습니다. 감사·보고 시 확인이 필요합니다.</p>
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th class="num">금액</th>
            <th>비고·재원</th>
          </tr>
        </thead>
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
        <td><code style="font-size:10px">${escapeHtml(r.ledgerIdShort)}</code></td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="muted">해당 구간에 관 지원금 수입 원장이 없습니다.</td></tr>`;

  return `
    <div class="section subsidy-section">
      <h2 class="sr-title">지원금 회계 보고서 (restricted_fund) ${badge}</h2>
      <p class="muted" style="margin:0 0 4px">기간·범위: ${escapeHtml(s.filterLabel)}</p>
      <p class="muted" style="margin:0;font-size:11px">본 구간은 일반 회계와 분리된 지원금 전용 원장(ledgerDomain: restricted_fund)을 기준으로 작성되었습니다.</p>

      <div class="sr-summary">
        <div class="sr-sum-card">
          <div class="lbl">지원금 수입(입금 완료)</div>
          <div class="val">${escapeHtml(formatReportWon(s.paidIn))}</div>
        </div>
        <div class="sr-sum-card">
          <div class="lbl">지원금 사용(지출)</div>
          <div class="val">${escapeHtml(formatReportWon(s.restrictedExpense))}</div>
        </div>
        <div class="sr-sum-card">
          <div class="lbl">남은 지원금</div>
          <div class="val">${escapeHtml(formatReportWon(s.balance))}</div>
        </div>
        <div class="sr-sum-card">
          <div class="lbl">집행률</div>
          <div class="val">${escapeHtml(pct)}</div>
        </div>
      </div>

      <h3 style="margin:16px 0 8px;font-size:14px">용도별 지원금 지출 (fundPurpose)</h3>
      <table>
        <thead>
          <tr><th>용도</th><th class="num">금액</th></tr>
        </thead>
        <tbody>${purposeBody}</tbody>
      </table>

      <h3 style="margin:16px 0 8px;font-size:14px">지원금 지출 내역</h3>
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>용도</th>
            <th>분류</th>
            <th class="num">금액</th>
            <th>연결 수입</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>${expenseBody}</tbody>
      </table>

      ${unlinkedBlock}

      <h3 style="margin:16px 0 8px;font-size:14px">관 지원금 수입 내역</h3>
      <table>
        <thead>
          <tr>
            <th>기준일</th>
            <th>지원·재원</th>
            <th>기금 용도</th>
            <th class="num">금액</th>
            <th>상태</th>
            <th>원장 ID</th>
          </tr>
        </thead>
        <tbody>${incomeBody}</tbody>
      </table>

      <p class="sr-foot">본 보고서의 지원금 수치는 위 기간·범위에 해당하는 원장만 포함합니다. 구독 한도 밖의 과거 거래는 별도 확인이 필요할 수 있습니다.</p>
    </div>
  `;
}

/** 지원금 PDF·인쇄 전용 (기관 제출·이메일용) */
export type FederationSubsidyOnlyReportParams = {
  federationName: string;
  federationSlug: string;
  generatedAt: string;
  subsidyReport: FederationSubsidyReportPrint;
  ledgerNote?: string;
};

export function renderSubsidyOnlyReportHtml(p: FederationSubsidyOnlyReportParams): string {
  const genLocal = new Date(p.generatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  const ledgerNoteBlock = p.ledgerNote?.trim()
    ? `<p class="muted" style="margin-top:8px">${escapeHtml(p.ledgerNote.trim())}</p>`
    : "";
  return `
    <div class="section">
      <h1>${escapeHtml(p.federationName)} — 지원금 회계 보고서</h1>
      <p class="slug">slug: ${escapeHtml(p.federationSlug)}</p>
      <p class="muted">문서: 지원금 전용 (ledgerDomain: restricted_fund)</p>
      <p class="muted">기간·범위: ${escapeHtml(p.subsidyReport.filterLabel)}</p>
      <p class="muted">생성 시각: ${escapeHtml(genLocal)}</p>
      ${ledgerNoteBlock}
    </div>
    ${renderSubsidyReportSection(p.subsidyReport)}
  `;
}

export function renderAccountingReportHtml(input: FederationAccountingReportPrintProps): string {
  const genLocal = new Date(input.generatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

  const incomeRows = input.incomeBuckets
    .map(
      (b) => `
      <tr>
        <td>${escapeHtml(b.label)}</td>
        <td class="num">${escapeHtml(formatReportWon(b.amount))}</td>
      </tr>`
    )
    .join("");

  const monthlyRows = input.monthlyRows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.monthLabel)}</td>
        <td class="num">${escapeHtml(formatReportWon(r.income))}</td>
        <td class="num">${escapeHtml(formatReportWon(r.expense))}</td>
        <td class="num">${escapeHtml(formatReportWon(r.cumulativeBalance))}</td>
      </tr>`
    )
    .join("");

  const txRows = input.recentTransactions
    .map(
      (tx) => `
      <tr>
        <td>${escapeHtml((tx.occurredAt || "").slice(0, 10))}</td>
        <td>${tx.type === "income" ? "수입" : "지출"}</td>
        <td>${escapeHtml(tx.domain)}</td>
        <td>${escapeHtml(tx.category)}</td>
        <td class="num">${escapeHtml(formatReportWon(tx.amount))}</td>
        <td>${escapeHtml(tx.memo ?? "")}</td>
      </tr>`
    )
    .join("");

  const aiBlock = input.aiSummary?.trim()
    ? `
    <div class="section">
      <h3>AI 회계 요약</h3>
      <div class="ai-box">${escapeHtml(input.aiSummary.trim())}</div>
    </div>`
    : "";

  const ledgerNoteBlock = input.ledgerNote?.trim()
    ? `<p class="muted" style="margin-top:8px">${escapeHtml(input.ledgerNote.trim())}</p>`
    : "";

  const subsidySectionHtml = `<div class="subsidy-page-break">${renderSubsidyReportSection(input.subsidyReport)}</div>`;

  return `
    <div class="section">
      <h1>${escapeHtml(input.federationName)} — 회계 리포트</h1>
      <p class="slug">slug: ${escapeHtml(input.federationSlug)}</p>
      <p class="muted">범위: ${escapeHtml(input.filterLabel)}</p>
      <p class="muted">생성 시각: ${escapeHtml(genLocal)}</p>
      ${ledgerNoteBlock}
    </div>

    <div class="section cards">
      <div class="card">
        <div class="muted">총 수입</div>
        <h2>${escapeHtml(formatReportWon(input.totalIncome))}</h2>
      </div>
      <div class="card">
        <div class="muted">총 지출</div>
        <h2>${escapeHtml(formatReportWon(input.totalExpense))}</h2>
      </div>
      <div class="card">
        <div class="muted">잔액 (수입−지출)</div>
        <h2>${escapeHtml(formatReportWon(input.balance))}</h2>
      </div>
    </div>

    <div class="section">
      <h3>월별 추이 (${escapeHtml(String(input.monthlyTableYear))}년)</h3>
      <p class="muted no-print-hint">연도·대회 범위 기준. 상단 「월」필터와 무관합니다.</p>
      <table>
        <thead>
          <tr>
            <th>월</th>
            <th class="num">수입</th>
            <th class="num">지출</th>
            <th class="num">누적 잔액</th>
          </tr>
        </thead>
        <tbody>${monthlyRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h3>수입 구성 (필터 구간)</h3>
      <table>
        <thead>
          <tr><th>항목</th><th class="num">금액</th></tr>
        </thead>
        <tbody>${incomeRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h3>미납 현황</h3>
      <table>
        <tbody>
          <tr><th>회비 미납·부분납 팀</th><td class="num">${input.unpaidTeamCount}팀</td></tr>
          <tr><th>대회 참가비 미납·미결제 등</th><td class="num">${input.unpaidCompetitionEntryCount}건</td></tr>
        </tbody>
      </table>
    </div>

    ${subsidySectionHtml}

    <div class="section">
      <h3>최근 원장 (${input.recentTransactions.length}건)</h3>
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>구분</th>
            <th>도메인</th>
            <th>분류</th>
            <th class="num">금액</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>${txRows}</tbody>
      </table>
    </div>

    ${aiBlock}
  `;
}

export function openAccountingReportPrintWindow(html: string, title: string): void {
  const win = window.open("", "_blank", "width=1024,height=900");
  if (!win) {
    throw new Error("PRINT_WINDOW_BLOCKED");
  }

  const safeTitle = escapeHtml(title);
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>${html}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 150);
}
