import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamFee } from "../types";
import { sortFeesStable } from "../utils/feeMonthUi";

export function useTeamFees(teamId: string) {
  const [fees, setFees] = useState<TeamFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setFees([]);
      setLoading(false);
      setError(null);
      return;
    }

    const q = query(collection(db, "teams", teamId, "fees"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: TeamFee[] = snap.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            title: String(data.title ?? ""),
            amount: Number(data.amount ?? 0),
            dueDate: data.dueDate,
            status: data.status === "closed" ? "closed" : "open",
            createdAt: data.createdAt,
            reminderSent: data.reminderSent === true ? true : undefined,
            lastReminderAt: data.lastReminderAt,
            overdueMemberCount:
              typeof data.overdueMemberCount === "number" && Number.isFinite(data.overdueMemberCount)
                ? data.overdueMemberCount
                : undefined,
            overdueUpdatedAt: data.overdueUpdatedAt,
            overdueReminderHistory:
              data.overdueReminderHistory && typeof data.overdueReminderHistory === "object"
                ? (data.overdueReminderHistory as Record<string, boolean>)
                : undefined,
            overdueReminderUpdatedAt: data.overdueReminderUpdatedAt,
            billingMode:
              data.billingMode === "autopay_optional" || data.billingMode === "autopay_required"
                ? data.billingMode
                : data.billingMode === "manual"
                  ? "manual"
                  : undefined,
            autopayRunAt: data.autopayRunAt,
            autopayStatus: data.autopayStatus,
            autopayLastRunAt: data.autopayLastRunAt,
            autoMonthKey:
              typeof data.autoMonthKey === "string" && data.autoMonthKey.trim()
                ? data.autoMonthKey.trim()
                : undefined,
          };
        });
        setFees(sortFeesStable(next));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("회비 목록을 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId]);

  return { fees, loading, error };
}
