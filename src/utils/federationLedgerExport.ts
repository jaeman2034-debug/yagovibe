import * as XLSX from "xlsx";
import type { FederationLedgerTransaction } from "@/types/federationOperating";
import { expenseCategoryLabel } from "@/types/federationOperating";

export function downloadFederationLedgerXlsx(
  rows: FederationLedgerTransaction[],
  opts: { federationSlug: string; filterLabel: string }
): void {
  const sorted = [...rows].sort((a, b) => (a.occurredAt || "").localeCompare(b.occurredAt || ""));
  const data = sorted.map((tx) => ({
    날짜: (tx.occurredAt || "").slice(0, 10),
    구분: tx.type === "expense" ? "지출" : "수입",
    회계트랙: tx.ledgerDomain === "restricted_fund" ? "지원금" : "일반",
    도메인: tx.domain,
    분류: tx.type === "expense" ? expenseCategoryLabel(tx.category) : tx.category,
    금액: tx.amount,
    대회연결: tx.competitionId ?? "",
    기금용도: tx.fundPurpose ?? "",
    연결지원금수입ID: tx.relatedFundIncomeId ?? "",
    재원메모:
      tx.type === "expense" ? (tx.relatedFundSource ?? "") : tx.incomeSourceType === "subsidy" ? (tx.fundSource ?? "") : "",
    비고: (tx.memo ?? "").replace(/\r?\n/g, " "),
    원장ID: tx.id,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "원장");
  const safe = opts.federationSlug.replace(/[^a-zA-Z0-9가-힣_-]/g, "_").slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `회계원장_${safe}_${opts.filterLabel}_${stamp}.xlsx`);
}
