/**
 * 월간 회계·지원금 PDF 생성 후 Storage 저장 (스케줄 / Callable 공용)
 */

import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions/v2";
import { parseLedgerTxServer, occurredInCalendarMonth, type ParsedLedgerTx } from "./ledgerTxParseServer";
import {
  buildFullMonthlyAccountingReportHtml,
  buildSubsidyOnlyMonthlyReportHtml,
  formatReportWon,
  type SubsidyReportPayload,
} from "./monthlyAccountingReportHtml";

const EXPENSE_CAT: Record<string, string> = {
  referee: "심판비",
  equipment: "장비·시설",
  event_cost: "행사·접대",
  transport: "교통·운반",
  uniform: "유니폼·용품",
  marketing: "홍보·인쇄",
  other: "기타",
};

const INCOME_SRC: Record<string, string> = {
  membership_fee: "정기 회비",
  competition_fee: "대회 참가비",
  subsidy: "관 지원금",
  sponsorship: "업체 후원금",
  registration_fee: "협회 가입비",
  donation: "회원 찬조금",
  other: "기타",
};

function expenseCategoryLabel(c: string): string {
  return EXPENSE_CAT[c] || c || "—";
}

function incomeSourceLabel(c?: string): string {
  if (!c) return "—";
  return INCOME_SRC[c] || c;
}

function isFederationManagerDoc(doc: Record<string, unknown> | undefined, uid: string): boolean {
  if (!doc || !uid) return false;
  const ownerUid = String(doc.ownerUid || doc.ownerId || "");
  if (ownerUid && ownerUid === uid) return true;
  const adminIds = Array.isArray(doc.adminIds) ? doc.adminIds : [];
  const adminUids = Array.isArray(doc.adminUids) ? doc.adminUids : [];
  const roles = doc.roles as Record<string, unknown> | undefined;
  const roleAdmins = Array.isArray(roles?.admins) ? (roles.admins as unknown[]) : [];
  const roleEditors = Array.isArray(roles?.editors) ? (roles.editors as unknown[]) : [];
  return [...adminIds, ...adminUids, ...roleAdmins, ...roleEditors].includes(uid);
}

function isIncomePaidForLedger(tx: ParsedLedgerTx): boolean {
  if (tx.type !== "income") return false;
  if (!tx.manualIncome) return true;
  return tx.incomeStatus === "paid";
}

function receivableManualIncome(tx: ParsedLedgerTx): number {
  if (tx.type !== "income" || !tx.manualIncome) return 0;
  if (tx.incomeStatus === "expected" || tx.incomeStatus === "pending") return Math.max(0, tx.amount);
  return 0;
}

function countedIncomeAmount(tx: ParsedLedgerTx): number {
  if (tx.type !== "income") return 0;
  return isIncomePaidForLedger(tx) ? Math.max(0, tx.amount) : 0;
}

function buildSubsidyPayload(
  monthTx: ParsedLedgerTx[],
  idLookup: Map<string, ParsedLedgerTx>,
  filterLabel: string
): SubsidyReportPayload {
  const restricted = monthTx.filter((t) => t.ledgerDomain === "restricted_fund");
  let paidIn = 0;
  let restrictedExpense = 0;
  for (const tx of restricted) {
    if (tx.type === "income" && isIncomePaidForLedger(tx)) paidIn += Math.max(0, tx.amount);
    if (tx.type === "expense") restrictedExpense += Math.max(0, tx.amount);
  }
  const balance = paidIn - restrictedExpense;
  const usagePct = paidIn > 0 ? Math.round((restrictedExpense / paidIn) * 1000) / 10 : null;

  const expenses = restricted
    .filter((t) => t.type === "expense")
    .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""));

  const byPurpose: Record<string, number> = {};
  for (const tx of expenses) {
    const key = (tx.fundPurpose?.trim() || "(미지정)").slice(0, 120);
    byPurpose[key] = (byPurpose[key] || 0) + Math.max(0, tx.amount);
  }
  const purposeRows = Object.entries(byPurpose).sort((a, b) => b[1] - a[1]);

  const expenseRows = expenses.map((tx) => {
    let linkedCaption = "미연결";
    const rid = tx.relatedFundIncomeId?.trim();
    if (rid) {
      const inc = idLookup.get(rid);
      linkedCaption = inc
        ? `${(inc.occurredAt || "").slice(0, 10)} · ${formatReportWon(inc.amount)} (${inc.id.slice(0, 10)}…)`
        : `원장 ID ${rid.slice(0, 12)}${rid.length > 12 ? "…" : ""}`;
    }
    const memo = [tx.memo != null ? String(tx.memo) : "", tx.relatedFundSource || ""]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 220);
    return {
      occurredAt: tx.occurredAt || "",
      fundPurpose: tx.fundPurpose?.trim() || "(미지정)",
      categoryLabel: expenseCategoryLabel(tx.category),
      amount: Math.max(0, tx.amount),
      linkedCaption,
      memo,
    };
  });

  const unlinkedRows = expenses
    .filter((tx) => !tx.relatedFundIncomeId?.trim())
    .map((tx) => ({
      occurredAt: tx.occurredAt || "",
      amount: Math.max(0, tx.amount),
      memo: [tx.memo != null ? String(tx.memo) : "", tx.relatedFundSource, tx.fundPurpose]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 220),
    }));

  const incomes = restricted
    .filter((t) => t.type === "income" && t.manualIncome && t.incomeSourceType === "subsidy")
    .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""));

  const incomeRows = incomes.map((tx) => {
    const ref =
      tx.incomeStatus === "paid" ? tx.occurredAt || "" : tx.expectedAt || tx.occurredAt || "";
    const statusLabel =
      tx.incomeStatus === "paid" ? "입금 완료" : tx.incomeStatus === "pending" ? "입금 대기" : "예정";
    const id = tx.id;
    return {
      occurredAt: ref,
      fundSource: tx.fundSource?.trim() || "—",
      fundPurpose: tx.fundPurpose?.trim() || "—",
      amount: Math.max(0, tx.amount),
      statusLabel,
      ledgerIdShort: id.length > 14 ? `${id.slice(0, 14)}…` : id,
    };
  });

  return {
    filterLabel,
    paidIn,
    restrictedExpense,
    balance,
    usagePct,
    auditStatus: unlinkedRows.length > 0 ? "unlinked" : "ok",
    purposeRows: purposeRows.map(([label, amount]) => ({ label, amount })),
    expenseRows,
    unlinkedRows,
    incomeRows,
  };
}

async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const { renderMonthlyReportHtmlToPdf } = await import("./monthlyAccountingReport.pdf");
  return renderMonthlyReportHtmlToPdf(html);
}

function federationDisplayName(data: Record<string, unknown> | undefined, slug: string): string {
  if (!data) return slug;
  const n = data.name ?? data.displayName ?? data.title ?? data.slug;
  const s = typeof n === "string" && n.trim() ? n.trim() : "";
  return s || slug;
}

export type MonthlyReportTrigger = "schedule" | "callable";

export type MonthlyReportRunResult =
  | { ok: true; fullPath: string; subsidyPath: string; skipped: boolean }
  | { ok: false; error: string };

export async function runMonthlyAccountingReport(params: {
  federationSlug: string;
  year: number;
  month: number;
  trigger: MonthlyReportTrigger;
  /**
   * true: 이미 accountingMonthlyReports/{year}-{mm} 가 있으면 PDF·메타 갱신 없이 스킵 (스케줄 기본).
   * false: 항상 재생성(덮어쓰기). Callable 기본.
   */
  skipIfReportExists?: boolean;
}): Promise<MonthlyReportRunResult> {
  const { federationSlug, year, month, trigger } = params;
  const skipIfReportExists =
    params.skipIfReportExists === undefined ? trigger === "schedule" : params.skipIfReportExists;
  const slug = String(federationSlug || "").trim();
  if (!slug) return { ok: false, error: "federationSlug가 필요합니다." };
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return { ok: false, error: "year, month(1~12)가 올바르지 않습니다." };
  }

  const db = getFirestore();
  const fedRef = db.doc(`federations/${slug}`);
  const fedSnap = await fedRef.get();
  if (!fedSnap.exists) return { ok: false, error: "협회를 찾을 수 없습니다." };

  const fedData = fedSnap.data() as Record<string, unknown>;

  const displayName = federationDisplayName(fedData, slug);
  const mm = String(month).padStart(2, "0");
  const metaRefEarly = fedRef.collection("accountingMonthlyReports").doc(`${year}-${mm}`);
  if (skipIfReportExists) {
    const existingMeta = await metaRefEarly.get();
    if (existingMeta.exists) {
      const m = existingMeta.data() as Record<string, unknown>;
      const fp = typeof m.fullStoragePath === "string" ? m.fullStoragePath.trim() : "";
      const sp = typeof m.subsidyStoragePath === "string" ? m.subsidyStoragePath.trim() : "";
      if (fp && sp) {
        logger.info("[runMonthlyAccountingReport] skip duplicate month", {
          slug,
          year,
          month,
          trigger,
          fullPath: fp,
          subsidyPath: sp,
        });
        return { ok: true, fullPath: fp, subsidyPath: sp, skipped: true };
      }
    }
  }

  const filterLabel = `${year}년 · ${month}월 · 협회 전체`;
  const generatedAtIso = new Date().toISOString();
  const ledgerNote =
    "원장은 occurredAt 기준 최근 2500건까지 조회한 뒤 해당 월만 필터링했습니다. 더 오래된 거래는 포함되지 않을 수 있습니다.";

  const col = fedRef.collection("transactions");
  const snap = await col.orderBy("occurredAt", "desc").limit(2500).get();
  const allParsed: ParsedLedgerTx[] = snap.docs.map((d) =>
    parseLedgerTxServer(d.id, d.data() as Record<string, unknown>)
  );
  const idLookup = new Map(allParsed.map((t) => [t.id, t]));
  const monthTx = allParsed.filter((t) => occurredInCalendarMonth(t.occurredAt, year, month));

  const subsidy = buildSubsidyPayload(monthTx, idLookup, filterLabel);

  const generalMonth = monthTx.filter((t) => t.ledgerDomain === "general");
  let generalIncomePaid = 0;
  let generalReceivable = 0;
  let generalExpense = 0;
  for (const tx of generalMonth) {
    if (tx.type === "expense") {
      generalExpense += Math.max(0, tx.amount);
    } else {
      generalIncomePaid += countedIncomeAmount(tx);
      generalReceivable += receivableManualIncome(tx);
    }
  }
  const generalBalance = generalIncomePaid - generalExpense;

  const generalRows = [...generalMonth]
    .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""))
    .map((tx) => ({
      date: (tx.occurredAt || "").slice(0, 10),
      kind: tx.type === "expense" ? "지출" : "수입",
      category:
        tx.type === "expense"
          ? expenseCategoryLabel(tx.category)
          : tx.manualIncome && tx.incomeSourceType
            ? incomeSourceLabel(tx.incomeSourceType)
            : tx.category,
      amount: Math.max(0, tx.amount),
      memo: (tx.memo != null ? String(tx.memo) : "").slice(0, 120),
    }));

  const htmlFull = buildFullMonthlyAccountingReportHtml({
    federationName: displayName,
    federationSlug: slug,
    generatedAtIso,
    filterLabel,
    ledgerNote,
    generalIncomePaid,
    generalReceivable,
    generalExpense,
    generalBalance,
    restrictedPaidIn: subsidy.paidIn,
    restrictedExpense: subsidy.restrictedExpense,
    restrictedBalance: subsidy.balance,
    generalRows,
  });

  const htmlSubsidy = buildSubsidyOnlyMonthlyReportHtml({
    federationName: displayName,
    federationSlug: slug,
    generatedAtIso,
    ledgerNote,
    subsidy,
  });

  let fullPdf: Buffer;
  let subsidyPdf: Buffer;
  try {
    fullPdf = await htmlToPdfBuffer(htmlFull);
    subsidyPdf = await htmlToPdfBuffer(htmlSubsidy);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[runMonthlyAccountingReport] puppeteer failed", { slug, year, month, msg });
    return { ok: false, error: `PDF 변환 실패: ${msg}` };
  }

  const bucket = getStorage().bucket();
  const base = `federations/${slug}/reports/monthly/${year}-${mm}`;
  const fullPath = `${base}/accounting-full.pdf`;
  const subsidyPath = `${base}/subsidy-only.pdf`;

  await bucket.file(fullPath).save(fullPdf, {
    contentType: "application/pdf",
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });
  await bucket.file(subsidyPath).save(subsidyPdf, {
    contentType: "application/pdf",
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });

  const metaRef = metaRefEarly;
  await metaRef.set(
    {
      year,
      month,
      fullStoragePath: fullPath,
      subsidyStoragePath: subsidyPath,
      generatedAt: new Date(),
      trigger,
      federationSlug: slug,
    },
    { merge: true }
  );

  logger.info("[runMonthlyAccountingReport] ok", { slug, year, month, fullPath, subsidyPath, trigger });

  return { ok: true, fullPath, subsidyPath, skipped: false };
}

export async function handleGenerateMonthlyAccountingReportCallable(request: {
  data?: { federationSlug?: string; year?: number; month?: number; skipIfExisting?: boolean };
  auth?: { uid?: string };
}): Promise<MonthlyReportRunResult> {
  const uid = request.auth?.uid;
  if (!uid) return { ok: false, error: "로그인이 필요합니다." };

  const federationSlug = String(request.data?.federationSlug || "").trim();
  const year = Math.floor(Number(request.data?.year));
  const month = Math.floor(Number(request.data?.month));
  if (!federationSlug) return { ok: false, error: "federationSlug가 필요합니다." };
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return { ok: false, error: "year가 올바르지 않습니다." };
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return { ok: false, error: "month는 1~12여야 합니다." };
  }

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) return { ok: false, error: "협회를 찾을 수 없습니다." };
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    return { ok: false, error: "협회 매니저만 실행할 수 있습니다." };
  }

  const skipIfExisting = request.data?.skipIfExisting === true;
  return runMonthlyAccountingReport({
    federationSlug,
    year,
    month,
    trigger: "callable",
    skipIfReportExists: skipIfExisting,
  });
}
