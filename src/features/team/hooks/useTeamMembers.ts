import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamMember } from "@/features/fees/types";
import { getMemberBillingUid } from "@/lib/team/memberBillingUid";
import { normalizeMemberDuesType } from "@/types/memberDues";

export function useTeamMembers(teamId: string) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }

    const q = query(collection(db, "teams", teamId, "members"), where("status", "==", "active"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: TeamMember[] = snap.docs.map((item) => {
          const data = item.data();
          const roleRaw = String(data.role ?? "member").toLowerCase();
          const role =
            roleRaw === "owner" || roleRaw === "manager" || roleRaw === "member"
              ? roleRaw
              : roleRaw === "admin"
                ? "manager"
                : "member";
          const authFields =
            (typeof data.userId === "string" && data.userId.trim()) ||
            (typeof data.uid === "string" && data.uid.trim()) ||
            "";
          /** 납부 문서 `feeId_uid`와 동일한 키 — 반드시 seedPaymentsForFee와 같은 규칙 */
          const billingUid = getMemberBillingUid(data as { userId?: unknown; uid?: unknown }, item.id);
          const linkedAuthUid = authFields || undefined;
          const duesRaw =
            data.duesType ??
            (typeof (data as Record<string, unknown>).dueType === "string"
              ? (data as Record<string, unknown>).dueType
              : undefined) ??
            data.feePlan;
          return {
            uid: billingUid,
            memberDocumentId: item.id,
            linkedAuthUid,
            name: String(data.name ?? data.displayName ?? data.userName ?? "이름없음"),
            role,
            joinedAt: data.joinedAt,
            duesType: normalizeMemberDuesType(duesRaw),
            yearlyPaidAt:
              (data.yearlyPaidAt as TeamMember["yearlyPaidAt"]) ??
              (data.annualPaidAt as TeamMember["yearlyPaidAt"]),
            discountAmount:
              typeof data.discountAmount === "number" && Number.isFinite(data.discountAmount)
                ? Math.max(0, Math.floor(data.discountAmount))
                : undefined,
            discountLabel:
              typeof data.discountLabel === "string" && data.discountLabel.trim()
                ? data.discountLabel.trim()
                : undefined,
          };
        });
        setMembers(next);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("멤버 목록을 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId]);

  return { members, loading, error };
}
