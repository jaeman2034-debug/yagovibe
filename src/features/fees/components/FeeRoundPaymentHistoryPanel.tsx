import { useMemo, useState } from "react";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import { resolveFeePaymentMemberId } from "../utils/feeDashboard";
import type { FeePayment } from "../types";

type Props = {
  feeTitle: string;
  payments: FeePayment[];
  /** billingUid·문서 ID 등 조인 키 → 표시 이름 */
  memberNameByKey: ReadonlyMap<string, string>;
};

function formatPaidAt(p: FeePayment): string {
  const d = firestoreLikeToDate(p.paidAt ?? p.updatedAt ?? p.requestedAt);
  if (!d) return "—";
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
}

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n)));
}

function sourceLabel(p: FeePayment): string {
  if (p.source === "manual") return "수동";
  if (p.source === "autopay") return "자동결제";
  if (p.source === "annual") return "연납";
  if (p.sourceType?.startsWith("annual")) return "연납";
  return p.source ? String(p.source) : "—";
}

function resolveDisplayName(p: FeePayment, memberNameByKey: ReadonlyMap<string, string>): string {
  const fromDoc = String(p.memberName ?? "").trim();
  if (fromDoc) return fromDoc;
  const mid = resolveFeePaymentMemberId(p);
  if (mid && memberNameByKey.has(mid)) return memberNameByKey.get(mid)!;
  if (p.uid && memberNameByKey.has(p.uid)) return memberNameByKey.get(p.uid)!;
  return mid || p.uid || "(이름 없음)";
}

export default function FeeRoundPaymentHistoryPanel({ feeTitle, payments, memberNameByKey }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = useMemo(() => {
    return [...payments].sort((a, b) => {
      const ta = firestoreLikeToDate(a.paidAt ?? a.updatedAt ?? a.requestedAt)?.getTime() ?? 0;
      const tb = firestoreLikeToDate(b.paidAt ?? b.updatedAt ?? b.requestedAt)?.getTime() ?? 0;
      return tb - ta;
    });
  }, [payments]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="fee-round-payment-history">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">이번 회차 납부 이력</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {feeTitle} · payments 문서 {sorted.length}건 (최신순)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          aria-expanded={!collapsed}
        >
          {collapsed ? "펼치기" : "접기"}
        </button>
      </div>
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">이 회차에 등록된 납부 기록이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900">{resolveDisplayName(p, memberNameByKey)}</span>
                    <span className="ml-2 text-xs text-slate-500">{p.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${
                        p.status === "paid"
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : p.status === "partial"
                            ? "bg-amber-50 text-amber-900 ring-amber-200"
                            : "bg-slate-100 text-slate-700 ring-slate-200"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-800">{formatWon(p.amount)}원</span>
                    <span className="text-slate-500">{sourceLabel(p)}</span>
                    <span className="text-slate-500">{formatPaidAt(p)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
