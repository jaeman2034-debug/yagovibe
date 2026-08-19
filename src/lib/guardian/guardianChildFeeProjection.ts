/**
 * S3 — Project fee status for linked children only (R1: never team-wide payment table).
 */
import type { Timestamp } from "firebase/firestore";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import type { FeeMemberRow, FeePayment, TeamFee, TeamMember } from "@/features/fees/types";
import { buildFeeMemberRows } from "@/features/fees/utils/feeDashboard";
import {
  linkedActivePlayerUidsForParent,
  memberMatchesLinkedPlayer,
} from "@/lib/guardian/guardianReadSelectors";
import type { ParentLinkRow } from "@/lib/team/parentLinksRead";

export type GuardianChildFeeRow = {
  playerUid: string;
  displayName: string;
  feeId: string;
  feeTitle: string;
  dueDateLabel: string | null;
  amountDueWon: number;
  paymentStatus: FeeMemberRow["paymentStatus"];
  paidAtLabel: string | null;
  sourceLabel: string | null;
};

function formatDue(dueDate?: Timestamp | Date | string | null): string | null {
  const d = firestoreLikeToDate(dueDate ?? undefined);
  if (!d) return null;
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function formatPaidAt(ts?: Timestamp): string | null {
  if (!ts || typeof ts.toDate !== "function") return null;
  return ts.toDate().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function sourceLabelFromRow(row: FeeMemberRow): string | null {
  if (row.settledManually) return "수동";
  if (row.paymentSource === "manual") return "수동";
  if (row.paymentSource === "autopay") return "자동결제";
  if (row.paymentSource === "annual") return "연납";
  return row.paymentSource ? String(row.paymentSource) : null;
}

/**
 * Build guardian-visible rows for one fee round — only players in active parentLinks.
 */
export function buildGuardianChildFeeRows(args: {
  parentUid: string;
  links: ParentLinkRow[];
  members: TeamMember[];
  payments: FeePayment[];
  fee: TeamFee;
}): GuardianChildFeeRow[] {
  const { parentUid, links, members, payments, fee } = args;
  const linked = linkedActivePlayerUidsForParent(links, parentUid);
  if (linked.size === 0) return [];

  const allRows = buildFeeMemberRows(
    members,
    payments,
    fee.amount,
    fee.dueDate ?? null,
    fee.id
  );

  const out: GuardianChildFeeRow[] = [];
  for (const playerUid of linked) {
    const row = allRows.find((r) => memberMatchesLinkedPlayer(r, playerUid));
    if (!row) {
      const name =
        members.find((m) => memberMatchesLinkedPlayer(m, playerUid))?.name ?? "팀원";
      out.push({
        playerUid,
        displayName: name,
        feeId: fee.id,
        feeTitle: fee.title,
        dueDateLabel: formatDue(fee.dueDate),
        amountDueWon: Math.max(0, Math.floor(fee.amount)),
        paymentStatus: "unpaid",
        paidAtLabel: null,
        sourceLabel: null,
      });
      continue;
    }
    out.push({
      playerUid,
      displayName: row.name,
      feeId: fee.id,
      feeTitle: fee.title,
      dueDateLabel: formatDue(fee.dueDate),
      amountDueWon: row.feeAmountDueWon ?? row.amount ?? fee.amount,
      paymentStatus: row.paymentStatus,
      paidAtLabel: formatPaidAt(row.paidAt),
      sourceLabel: sourceLabelFromRow(row),
    });
  }

  out.sort((a, b) => a.displayName.localeCompare(b.displayName, "ko", { sensitivity: "base" }));
  return out;
}

/** In-memory filter: drop payments not belonging to linked children before any UI table. */
export function filterPaymentsForLinkedChildren(
  payments: FeePayment[],
  parentUid: string,
  links: ParentLinkRow[],
  members: TeamMember[]
): FeePayment[] {
  const linked = linkedActivePlayerUidsForParent(links, parentUid);
  if (linked.size === 0) return [];

  return payments.filter((p) => {
    const mid = String(p.memberId ?? p.uid ?? "").trim();
    if (mid && [...linked].some((uid) => mid === uid)) return true;
    return members.some(
      (m) => memberMatchesLinkedPlayer(m, mid) && [...linked].some((uid) => memberMatchesLinkedPlayer(m, uid))
    );
  });
}
