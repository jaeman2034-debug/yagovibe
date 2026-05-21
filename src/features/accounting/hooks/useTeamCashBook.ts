import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  TEAM_CASH_BOOK_UI_ROW_LIMIT,
  subscribeTeamCashBookMonthSlice,
  subscribeTeamCashBookRows,
  subscribeTeamCashBookSummary,
} from "@/lib/team/teamCashBook";
import type { TeamCashBookSummary, TeamCashBookTransaction, TeamMonthlySummary } from "@/types/teamAccounting";

function startEndOfMonth(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function startEndOfOffsetMonth(base: Date, offsetMonths: number): { start: Date; end: Date } {
  const d = new Date(base.getFullYear(), base.getMonth() + offsetMonths, 1);
  return startEndOfMonth(d);
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function useTeamCashBook(teamId: string | undefined) {
  const [summary, setSummary] = useState<TeamCashBookSummary | null>(null);
  const [rows, setRows] = useState<TeamCashBookTransaction[]>([]);
  const [monthRows, setMonthRows] = useState<TeamCashBookTransaction[]>([]);
  const [prevMonthRows, setPrevMonthRows] = useState<TeamCashBookTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthQueryFailed, setMonthQueryFailed] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<TeamMonthlySummary | null>(null);
  const [prevMonthlySummary, setPrevMonthlySummary] = useState<TeamMonthlySummary | null>(null);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMonthQueryFailed(false);

    const { start, end } = startEndOfOffsetMonth(new Date(), 0);
    const { start: prevStart, end: prevEnd } = startEndOfOffsetMonth(new Date(), -1);

    const unsubSummary = subscribeTeamCashBookSummary(
      teamId,
      (s) => setSummary(s),
      (e) => console.warn("[cashBook] summary", e)
    );

    const unsubRows = subscribeTeamCashBookRows(
      teamId,
      (r) => {
        setRows(r);
        setLoading(false);
      },
      (e) => {
        setError(e.message || "출납부를 불러오지 못했습니다.");
        setLoading(false);
      },
      { maxRows: TEAM_CASH_BOOK_UI_ROW_LIMIT }
    );

    const unsubMonth = subscribeTeamCashBookMonthSlice(
      teamId,
      { start, end },
      (r) => {
        setMonthRows(r);
        setMonthQueryFailed(false);
      },
      () => {
        setMonthQueryFailed(true);
        setMonthRows([]);
      }
    );
    const unsubPrevMonth = subscribeTeamCashBookMonthSlice(
      teamId,
      { start: prevStart, end: prevEnd },
      (r) => setPrevMonthRows(r),
      () => setPrevMonthRows([])
    );

    return () => {
      unsubSummary();
      unsubRows();
      unsubMonth();
      unsubPrevMonth();
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      setMonthlySummary(null);
      setPrevMonthlySummary(null);
      return;
    }
    const now = new Date();
    const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthId = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    function parseMonthlySummary(
      snap: { exists: () => boolean; data: () => Record<string, unknown> },
      targetMonthId: string
    ): TeamMonthlySummary | null {
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      let updatedAt: string | undefined;
      const ua = d.updatedAt;
      if (ua && typeof (ua as { toDate?: () => Date }).toDate === "function") {
        updatedAt = (ua as { toDate: () => Date }).toDate().toISOString();
      } else if (typeof ua === "string") {
        updatedAt = ua;
      }
      const rowsRaw = Array.isArray(d.memberContributionTop) ? d.memberContributionTop : [];
      const rows = rowsRaw
        .map((x) => {
          const r = x as Record<string, unknown>;
          const uid = typeof r.uid === "string" ? r.uid : "";
          if (!uid) return null;
          return {
            uid,
            name: typeof r.name === "string" ? r.name : "이름없음",
            total: Number(r.total || 0),
            membership: Number(r.membership || 0),
            donation: Number(r.donation || 0),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
      return {
        monthId: targetMonthId,
        totalIncome: Number(d.totalIncome || 0),
        totalExpense: Number(d.totalExpense || 0),
        net: Number(d.net || 0),
        topIncomeCategory:
          typeof d.topIncomeCategory === "string" ? (d.topIncomeCategory as TeamMonthlySummary["topIncomeCategory"]) : null,
        topExpenseCategory:
          typeof d.topExpenseCategory === "string"
            ? (d.topExpenseCategory as TeamMonthlySummary["topExpenseCategory"])
            : null,
        memberContributionTop: rows,
        updatedAt,
      };
    }

    const currentRef = doc(db, "teams", teamId, "monthlySummary", monthId);
    const prevRef = doc(db, "teams", teamId, "monthlySummary", prevMonthId);
    const unsubCurrent = onSnapshot(
      currentRef,
      (snap) => setMonthlySummary(parseMonthlySummary(snap, monthId)),
      () => setMonthlySummary(null)
    );
    const unsubPrev = onSnapshot(
      prevRef,
      (snap) => setPrevMonthlySummary(parseMonthlySummary(snap, prevMonthId)),
      () => setPrevMonthlySummary(null)
    );
    return () => {
      unsubCurrent();
      unsubPrev();
    };
  }, [teamId]);

  const monthSlice = useMemo(() => {
    const { start, end } = startEndOfMonth(new Date());
    if (!monthQueryFailed) return monthRows;
    return rows.filter((r) => inRange(r.occurredAt, start, end));
  }, [monthRows, monthQueryFailed, rows]);

  const activeMonthSlice = useMemo(() => monthSlice.filter((r) => !r.isDeleted), [monthSlice]);
  const activePrevMonthSlice = useMemo(() => prevMonthRows.filter((r) => !r.isDeleted), [prevMonthRows]);

  const monthIncome = useMemo(
    () => activeMonthSlice.filter((r) => r.kind === "income").reduce((a, r) => a + r.amount, 0),
    [activeMonthSlice]
  );
  const monthExpense = useMemo(
    () => activeMonthSlice.filter((r) => r.kind === "expense").reduce((a, r) => a + r.amount, 0),
    [activeMonthSlice]
  );

  const incomeByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activeMonthSlice) {
      if (r.kind !== "income") continue;
      m.set(r.category, (m.get(r.category) ?? 0) + r.amount);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeMonthSlice]);

  const expenseByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activeMonthSlice) {
      if (r.kind !== "expense") continue;
      m.set(r.category, (m.get(r.category) ?? 0) + r.amount);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeMonthSlice]);

  const prevExpenseByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activePrevMonthSlice) {
      if (r.kind !== "expense") continue;
      m.set(r.category, (m.get(r.category) ?? 0) + r.amount);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [activePrevMonthSlice]);

  const balanceDisplay = summary?.balance ?? 0;

  /**
   * 무효 제외 — occurredAt 최신순 최대 TEAM_CASH_BOOK_UI_ROW_LIMIT 건만.
   * 전체 원장 합 ≠ 누적 잔액(오래된 거래가 목록 밖에 있으면 수천만 원 차이 가능).
   */
  const ledgerIncomeTotal = useMemo(
    () => rows.filter((r) => !r.isDeleted && r.kind === "income").reduce((a, r) => a + r.amount, 0),
    [rows]
  );
  const ledgerExpenseTotal = useMemo(
    () => rows.filter((r) => !r.isDeleted && r.kind === "expense").reduce((a, r) => a + r.amount, 0),
    [rows]
  );
  const ledgerNet = ledgerIncomeTotal - ledgerExpenseTotal;
  /** 요약이 없으면(첫 거래 전·구데이터) 원장 로드분 순액으로 표시 */
  const balancePreferred = summary != null ? summary.balance : ledgerNet;

  const mealLoggedThisWeek = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return rows.some((r) => {
      if (r.isDeleted) return false;
      if (r.kind !== "expense") return false;
      if (r.category !== "meal") return false;
      const t = new Date(r.occurredAt).getTime();
      return t >= weekAgo && t <= now;
    });
  }, [rows]);

  /** 어제 기록한 식사/음료 지출 — 빠른 반복 입력용 */
  const yesterdayMealSuggestion = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const y0 = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0).getTime();
    const y1 = y0 + 24 * 60 * 60 * 1000;
    const candidates = rows
      .filter((r) => !r.isDeleted && r.kind === "expense" && r.category === "meal")
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    const hit = candidates.find((r) => {
      const t = new Date(r.occurredAt).getTime();
      return t >= y0 && t < y1;
    });
    if (!hit) return null;
    return { amount: hit.amount, memo: hit.memo?.trim() || undefined };
  }, [rows]);

  return {
    summary,
    rows,
    cashBookUiRowLimit: TEAM_CASH_BOOK_UI_ROW_LIMIT,
    monthSlice,
    monthIncome,
    monthExpense,
    incomeByCategory,
    expenseByCategory,
    prevExpenseByCategory,
    balanceDisplay,
    ledgerIncomeTotal,
    ledgerExpenseTotal,
    ledgerNet,
    balancePreferred,
    loading,
    error,
    monthQueryFailed,
    mealLoggedThisWeek,
    yesterdayMealSuggestion,
    monthlySummary,
    prevMonthlySummary,
  };
}
