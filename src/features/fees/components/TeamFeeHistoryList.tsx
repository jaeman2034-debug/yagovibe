import type { TeamFee } from "@/types/fee";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import {
  isDueInSeoulYm,
  teamFeeCurrentSeoulMonthKey,
  teamFeeSeoulCalendarYear,
} from "@/lib/fees/seoulFeeMonthKey";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { FeeRollupEntry, FeeRollupStatus } from "@/features/fees/utils/feeCollectionRollup";

function rollupForOpenFee(
  feeId: string,
  statusById: Record<string, FeeRollupStatus>,
  rollById: Record<string, FeeRollupEntry>
):
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ok"; entry: FeeRollupEntry } {
  const st = statusById[feeId];
  if (st === "error") return { kind: "error" };
  if (st !== "success") return { kind: "loading" };
  const entry = rollById[feeId];
  if (!entry) return { kind: "error" };
  return { kind: "ok", entry };
}

/** 마감 가능(null) / 불가 시 운영자용 메시지(호버·토스트용) */
export function getCloseDisabledReason(
  feeId: string,
  statusById: Record<string, FeeRollupStatus>,
  rollById: Record<string, FeeRollupEntry>
): string | null {
  const rs = rollupForOpenFee(feeId, statusById, rollById);
  if (rs.kind === "loading") {
    return "마감 불가 사유:\n- 집계 중입니다";
  }
  if (rs.kind === "error") {
    return "마감 불가 사유:\n- 집계 실패 상태입니다";
  }
  if (rs.kind === "ok" && rs.entry.status !== "paid") {
    if (rs.entry.status === "partial") {
      return `마감 불가 사유:\n- 일부만 납부됨 (${rs.entry.paidCount}/${rs.entry.totalCount})`;
    }
    const n =
      rs.entry.totalCount > 0 ? rs.entry.totalCount - rs.entry.paidCount : 0;
    if (n > 0) {
      return `마감 불가 사유:\n- 미납 멤버 ${n}명`;
    }
    return "마감 불가 사유:\n- 전원 납부 완료로 표시되지 않았습니다";
  }
  return null;
}

function bulkCloseDisabledReasonLines(
  feeIds: string[],
  statusById: Record<string, FeeRollupStatus>,
  rollById: Record<string, FeeRollupEntry>
): string[] {
  let loading = false;
  let error = false;
  let notPaid = false;
  for (const id of feeIds) {
    const rs = rollupForOpenFee(id, statusById, rollById);
    if (rs.kind === "loading") loading = true;
    if (rs.kind === "error") error = true;
    if (rs.kind === "ok" && rs.entry.status !== "paid") notPaid = true;
  }
  const lines: string[] = [];
  if (loading) lines.push("- 집계 중입니다");
  if (error) lines.push("- 집계 실패 상태인 회차가 있습니다");
  if (notPaid) lines.push("- 미납·일부납부 멤버가 있어 전원 납부 완료가 아닙니다");
  return lines;
}

function formatBulkCloseBlockMessage(lines: string[]): string {
  if (lines.length === 0) return "마감 불가 사유를 확인할 수 없습니다.";
  return ["마감 불가 사유:", ...lines].join("\n");
}

/** 마감 가능 시 버튼·툴팁용 긍정 피드백 */
const CLOSE_READY_SINGLE_TOOLTIP =
  "마감 가능: 모든 인원이 납부 완료된 상태입니다.";
const CLOSE_READY_MONTH_TOOLTIP =
  "마감 가능: 이번 달 대상 회비가 모두 납부 완료되었습니다.";
const CLOSE_READY_SELECTED_TOOLTIP =
  "마감 가능: 선택한 회비가 모두 납부 완료되었습니다.";

export type TeamFeeHistoryListProps = {
  fees: TeamFee[];
  feeRollupByFeeId?: Record<string, FeeRollupEntry>;
  /** 회차별 집계 — `success`일 때만 미납/진행/완납 필터·마감 버튼 활성 기준으로 사용 */
  feeRollupStatusByFeeId?: Record<string, FeeRollupStatus>;
  loading: boolean;
  onCloseFee: (feeId: string) => void | Promise<void>;
  onCloseManyFees?: (feeIds: string[]) => void | Promise<void>;
  onReopenFee?: (fee: TeamFee) => void | Promise<void>;
};

/** 회비 히스토리 · 마감 처리 */
export default function TeamFeeHistoryList({
  fees,
  feeRollupByFeeId = {},
  feeRollupStatusByFeeId = {},
  loading,
  onCloseFee,
  onCloseManyFees,
  onReopenFee,
}: TeamFeeHistoryListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "unpaid" | "partial" | "paid" | "closed"
  >("all");
  const [openedYears, setOpenedYears] = useState<Record<number, boolean>>({});
  const [selectedFeeIds, setSelectedFeeIds] = useState<Record<string, boolean>>({});
  const feesSorted = useMemo(() => {
    return [...fees].sort((a, b) => {
      const ad = a.dueDate?.toDate?.()?.getTime?.() ?? 0;
      const bd = b.dueDate?.toDate?.()?.getTime?.() ?? 0;
      return bd - ad;
    });
  }, [fees]);
  const feesFiltered = useMemo(() => {
    if (statusFilter === "all") return feesSorted;
    if (statusFilter === "closed") return feesSorted.filter((f) => f.status === "closed");
    return feesSorted.filter((f) => {
      if (f.status !== "open") return false;
      const rs = rollupForOpenFee(f.id, feeRollupStatusByFeeId, feeRollupByFeeId);
      if (rs.kind !== "ok") return false;
      const agg = rs.entry.status;
      if (statusFilter === "unpaid") return agg === "unpaid";
      if (statusFilter === "partial") return agg === "partial";
      if (statusFilter === "paid") return agg === "paid";
      return false;
    });
  }, [feesSorted, statusFilter, feeRollupByFeeId, feeRollupStatusByFeeId]);
  const grouped = useMemo(() => {
    const m = new Map<number, TeamFee[]>();
    for (const f of feesFiltered) {
      const due = firestoreLikeToDate(f.dueDate as unknown);
      const y = due ? teamFeeSeoulCalendarYear(due) : 0;
      const arr = m.get(y) ?? [];
      arr.push(f);
      m.set(y, arr);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [feesFiltered]);
  const selectedOpenFeeIds = useMemo(
    () => feesSorted.filter((f) => f.status === "open" && selectedFeeIds[f.id]).map((f) => f.id),
    [feesSorted, selectedFeeIds]
  );
  const currentMonthOpenFeeIds = useMemo(() => {
    const ym = teamFeeCurrentSeoulMonthKey();
    return feesSorted
      .filter((f) => {
        if (f.status !== "open") return false;
        const d = firestoreLikeToDate(f.dueDate as unknown);
        return isDueInSeoulYm(d, ym);
      })
      .map((f) => f.id);
  }, [feesSorted]);

  const currentMonthCanClose = useMemo(() => {
    if (currentMonthOpenFeeIds.length === 0) return false;
    return currentMonthOpenFeeIds.every((id) => {
      const rs = rollupForOpenFee(id, feeRollupStatusByFeeId, feeRollupByFeeId);
      return rs.kind === "ok" && rs.entry.status === "paid";
    });
  }, [currentMonthOpenFeeIds, feeRollupStatusByFeeId, feeRollupByFeeId]);

  const selectedOpenFeesCanClose = useMemo(() => {
    if (selectedOpenFeeIds.length === 0) return false;
    return selectedOpenFeeIds.every((id) => {
      const rs = rollupForOpenFee(id, feeRollupStatusByFeeId, feeRollupByFeeId);
      return rs.kind === "ok" && rs.entry.status === "paid";
    });
  }, [selectedOpenFeeIds, feeRollupStatusByFeeId, feeRollupByFeeId]);

  const currentMonthCloseTitle = useMemo(() => {
    if (!onCloseManyFees) return "일괄 마감을 사용할 수 없습니다.";
    if (currentMonthOpenFeeIds.length === 0) {
      return "이번 달 마감 대상인 오픈 회비가 없습니다.";
    }
    if (!currentMonthCanClose) {
      return formatBulkCloseBlockMessage(
        bulkCloseDisabledReasonLines(
          currentMonthOpenFeeIds,
          feeRollupStatusByFeeId,
          feeRollupByFeeId
        )
      );
    }
    return CLOSE_READY_MONTH_TOOLTIP;
  }, [
    onCloseManyFees,
    currentMonthOpenFeeIds,
    currentMonthCanClose,
    feeRollupStatusByFeeId,
    feeRollupByFeeId,
  ]);

  const selectedBulkCloseTitle = useMemo(() => {
    if (!onCloseManyFees) return "일괄 마감을 사용할 수 없습니다.";
    if (selectedOpenFeeIds.length === 0) {
      return "선택한 오픈 회비가 없습니다.";
    }
    if (!selectedOpenFeesCanClose) {
      return formatBulkCloseBlockMessage(
        bulkCloseDisabledReasonLines(selectedOpenFeeIds, feeRollupStatusByFeeId, feeRollupByFeeId)
      );
    }
    return CLOSE_READY_SELECTED_TOOLTIP;
  }, [
    onCloseManyFees,
    selectedOpenFeeIds,
    selectedOpenFeesCanClose,
    feeRollupStatusByFeeId,
    feeRollupByFeeId,
  ]);

  const monthButtonHardDisabled = !onCloseManyFees || currentMonthOpenFeeIds.length === 0;
  const monthButtonSoftBlocked =
    Boolean(onCloseManyFees) &&
    currentMonthOpenFeeIds.length > 0 &&
    !currentMonthCanClose;

  const selectedBulkHardDisabled = !onCloseManyFees || selectedOpenFeeIds.length === 0;
  const selectedBulkSoftBlocked =
    Boolean(onCloseManyFees) &&
    selectedOpenFeeIds.length > 0 &&
    !selectedOpenFeesCanClose;

  const toggleYear = (y: number) => {
    setOpenedYears((prev) => ({ ...prev, [y]: !(prev[y] ?? y === grouped[0]?.[0]) }));
  };
  const isYearOpened = (y: number) => openedYears[y] ?? y === grouped[0]?.[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">회비 히스토리 · 마감</h3>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "회비 히스토리 목록 펼치기" : "회비 히스토리 목록 접기"}
        >
          {collapsed ? "목록 펼치기" : "목록 접기"}
        </button>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">진행 중인 회비를 마감하면 더 이상 납부를 받지 않습니다.</p>
      {!collapsed && <div className="mt-3 flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "전체" },
          { id: "unpaid", label: "미납" },
          { id: "partial", label: "진행중" },
          { id: "paid", label: "납부완료" },
          { id: "closed", label: "마감완료" },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() =>
              setStatusFilter(chip.id as "all" | "unpaid" | "partial" | "paid" | "closed")
            }
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              statusFilter === chip.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>}
      {!collapsed && <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          title={currentMonthCloseTitle}
          aria-disabled={monthButtonHardDisabled || monthButtonSoftBlocked}
          onClick={() => {
            if (monthButtonHardDisabled) return;
            if (monthButtonSoftBlocked) {
              toast.message("이번달 마감을 할 수 없습니다", {
                description: currentMonthCloseTitle,
              });
              return;
            }
            const ok = window.confirm(
              "이번달 회비를 마감하시겠습니까?\n- 납부 완료된 인원만 마감됩니다\n- 이후 수정 제한됩니다"
            );
            if (!ok) return;
            void onCloseManyFees!(currentMonthOpenFeeIds);
          }}
          className={`min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 ${
            monthButtonSoftBlocked ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={monthButtonHardDisabled}
        >
          이번달 마감
        </button>
        <button
          type="button"
          title={selectedBulkCloseTitle}
          aria-disabled={selectedBulkHardDisabled || selectedBulkSoftBlocked}
          onClick={() => {
            if (selectedBulkHardDisabled) return;
            if (selectedBulkSoftBlocked) {
              toast.message("선택 마감을 할 수 없습니다", {
                description: selectedBulkCloseTitle,
              });
              return;
            }
            const ok = window.confirm(
              "선택한 회비를 마감하시겠습니까?\n- 납부 완료된 인원만 마감됩니다\n- 이후 수정 제한됩니다"
            );
            if (!ok) return;
            void onCloseManyFees!(selectedOpenFeeIds);
          }}
          className={`min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 ${
            selectedBulkSoftBlocked ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={selectedBulkHardDisabled}
        >
          선택 마감
        </button>
      </div>}

      {!collapsed && loading && <p className="mt-3 text-sm text-slate-500">불러오는 중...</p>}
      {!collapsed && !loading && fees.length === 0 && <p className="mt-3 text-sm text-slate-500">등록된 회비가 없습니다.</p>}

      {!collapsed && <div className="mt-3 space-y-3">
        {grouped.map(([year, yearFees]) => (
          <div key={year} className="rounded-xl border border-slate-100 bg-slate-50/30">
            <button
              type="button"
              onClick={() => toggleYear(year)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="text-sm font-semibold text-slate-900">
                {isYearOpened(year) ? "▼" : "▶"} {year}년 회비 ({yearFees.length}건)
              </span>
            </button>
            {isYearOpened(year) ? (
              <div className="space-y-2 border-t border-slate-100 p-3">
                {yearFees.map((fee) => {
                  const openRoll =
                    fee.status === "open"
                      ? rollupForOpenFee(fee.id, feeRollupStatusByFeeId, feeRollupByFeeId)
                      : null;
                  const closeBlockReason =
                    fee.status === "open"
                      ? getCloseDisabledReason(fee.id, feeRollupStatusByFeeId, feeRollupByFeeId)
                      : null;
                  const canCloseThisFee = fee.status === "open" && closeBlockReason === null;
                  const unpaidHeadcount =
                    openRoll?.kind === "ok" &&
                    openRoll.entry.status === "unpaid" &&
                    openRoll.entry.totalCount > 0
                      ? openRoll.entry.totalCount - openRoll.entry.paidCount
                      : 0;

                  return (
                  <div
                    key={fee.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{fee.title}</p>
                      <p className="text-sm text-slate-600">
                        {fee.amount.toLocaleString("ko-KR")}원 ·{" "}
                        {fee.dueDate?.toDate ? fee.dueDate.toDate().toLocaleDateString("ko-KR") : "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {fee.status === "open" && onCloseManyFees ? (
                        <input
                          type="checkbox"
                          checked={selectedFeeIds[fee.id] === true}
                          onChange={(e) =>
                            setSelectedFeeIds((prev) => ({ ...prev, [fee.id]: e.target.checked }))
                          }
                          aria-label={`${fee.title} 선택`}
                        />
                      ) : null}
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          fee.status === "closed"
                            ? "bg-slate-200 text-slate-700"
                            : openRoll?.kind === "error"
                              ? "bg-orange-100 text-orange-900"
                              : openRoll?.kind === "loading"
                                ? "bg-slate-100 text-slate-600"
                                : openRoll?.kind === "ok" && openRoll.entry.status === "paid"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : openRoll?.kind === "ok" && openRoll.entry.status === "partial"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {fee.status === "closed"
                          ? "마감됨"
                          : openRoll?.kind === "error"
                            ? "집계 실패"
                            : openRoll?.kind === "loading"
                              ? "집계 중"
                              : openRoll?.kind === "ok" && openRoll.entry.status === "paid"
                                ? "납부완료"
                                : openRoll?.kind === "ok" && openRoll.entry.status === "partial"
                                  ? `일부납부 (${openRoll.entry.paidCount}/${openRoll.entry.totalCount})`
                                  : unpaidHeadcount > 0
                                    ? `미납 ${unpaidHeadcount}명`
                                    : "미납"}
                      </span>
                      {fee.status === "open" ? (
                        <button
                          type="button"
                          aria-disabled={!canCloseThisFee}
                          title={
                            closeBlockReason ?? CLOSE_READY_SINGLE_TOOLTIP
                          }
                          onClick={() => {
                            if (!canCloseThisFee) {
                              toast.message("마감할 수 없습니다", {
                                description: closeBlockReason ?? undefined,
                              });
                              return;
                            }
                            void onCloseFee(fee.id);
                          }}
                          className={`min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 ${
                            !canCloseThisFee ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          마감 처리
                        </button>
                      ) : onReopenFee ? (
                        <button
                          type="button"
                          onClick={() => void onReopenFee(fee)}
                          className="min-h-[40px] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
                        >
                          마감 취소
                        </button>
                      ) : null}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
        {!loading && grouped.length === 0 ? (
          <p className="text-sm text-slate-500">필터 조건에 맞는 회비가 없습니다.</p>
        ) : null}
      </div>}
    </div>
  );
}
