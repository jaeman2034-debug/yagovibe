import { collection, doc, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  isBillingEntitledForPaidFeatures,
  isPlanAtLeast,
  normalizeHubBillingStatus,
  normalizeHubTeamPlan,
} from "@/lib/billing/hubTeamPlanGates";
import type { HubTeamBillingStatus, HubTeamPlanId } from "@/types/teamBilling";

export type TeamBillingSnapshot = {
  plan: HubTeamPlanId;
  billingStatus: HubTeamBillingStatus;
  ownerUid: string;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  currentPeriodEnd: Date | null;
  billingUnitAmount: number | null;
  billingCurrency: string | null;
};

/**
 * `teams/{teamId}` 문서 + (선택) `subscriptions` 미러( teamId, plan, status ) 를 합쳐
 * `teams`만 늦게 갱신돼도 페이월/기능 판정이 맞게 보이게 함.
 * — Org Pro 구독은 `subscriptions.orgId` 쪽이고, 팀 화면은 `teamId` + `teams.plan` 이 별도이므로
 *   org 결제만으로 팀 `plan` 이 안 바뀌는 것은 **정상**이다.
 */
function mergeTeamWithSubscriptionMirror(
  team: TeamBillingSnapshot,
  bestFromSub: {
    plan: HubTeamPlanId;
    status: HubTeamBillingStatus;
    cancelAtPeriodEnd: boolean;
    priceId: string | null;
    currentPeriodEnd: Date | null;
    billingUnitAmount: number | null;
    billingCurrency: string | null;
  } | null
): TeamBillingSnapshot {
  if (!bestFromSub) return team;
  if (isPlanAtLeast(bestFromSub.plan, team.plan)) {
    return {
      ...team,
      plan: bestFromSub.plan,
      billingStatus: bestFromSub.status,
      cancelAtPeriodEnd: bestFromSub.cancelAtPeriodEnd,
      priceId: bestFromSub.priceId,
      currentPeriodEnd: bestFromSub.currentPeriodEnd ?? team.currentPeriodEnd,
      billingUnitAmount: bestFromSub.billingUnitAmount ?? team.billingUnitAmount,
      billingCurrency: bestFromSub.billingCurrency ?? team.billingCurrency,
    };
  }
  return team;
}

/**
 * `teams/{teamId}` 의 plan / billingStatus 실시간 구독 (페이월 UX 전용, 서버 검증은 별도).
 */
export function useTeamBillingDoc(teamId: string | undefined): {
  billing: TeamBillingSnapshot | null;
  loading: boolean;
} {
  const [rawTeam, setRawTeam] = useState<TeamBillingSnapshot | null>(null);
  const [subBest, setSubBest] = useState<{
    plan: HubTeamPlanId;
    status: HubTeamBillingStatus;
    cancelAtPeriodEnd: boolean;
    priceId: string | null;
    currentPeriodEnd: Date | null;
    billingUnitAmount: number | null;
    billingCurrency: string | null;
  } | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [subTouched, setSubTouched] = useState(false);

  const billing = useMemo(
    () => (rawTeam ? mergeTeamWithSubscriptionMirror(rawTeam, subBest) : null),
    [rawTeam, subBest]
  );

  useEffect(() => {
    if (!teamId) {
      setRawTeam(null);
      setSubBest(null);
      setTeamLoading(false);
      setSubTouched(false);
      return;
    }
    setTeamLoading(true);
    setSubTouched(false);
    const ref = doc(db, "teams", teamId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setTeamLoading(false);
        if (!snap.exists()) {
          setRawTeam(null);
          return;
        }
        const d = snap.data() as Record<string, unknown>;
        setRawTeam({
          plan: normalizeHubTeamPlan(d.plan),
          billingStatus: normalizeHubBillingStatus(d.billingStatus),
          ownerUid: typeof d.ownerUid === "string" ? d.ownerUid.trim() : "",
          cancelAtPeriodEnd: d.cancelAtPeriodEnd === true,
          priceId: typeof d.priceId === "string" ? d.priceId : null,
          currentPeriodEnd:
            d.currentPeriodEnd &&
            typeof (d.currentPeriodEnd as { toDate?: () => Date }).toDate === "function"
              ? (d.currentPeriodEnd as { toDate: () => Date }).toDate()
              : null,
          billingUnitAmount:
            typeof d.billingUnitAmount === "number" && Number.isFinite(d.billingUnitAmount)
              ? d.billingUnitAmount
              : null,
          billingCurrency: typeof d.billingCurrency === "string" ? d.billingCurrency : null,
        });
      },
      () => {
        setTeamLoading(false);
        setRawTeam(null);
      }
    );
    return () => unsub();
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      setSubTouched(false);
      setSubBest(null);
      return;
    }

    let cancelled = false;
    const q = query(collection(db, "subscriptions"), where("teamId", "==", teamId), limit(8));

    void getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        let chosen: {
          plan: HubTeamPlanId;
          status: HubTeamBillingStatus;
          cancelAtPeriodEnd: boolean;
          priceId: string | null;
          currentPeriodEnd: Date | null;
          billingUnitAmount: number | null;
          billingCurrency: string | null;
        } | null = null;
        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          if (data.plan == null) continue;
          const p = normalizeHubTeamPlan(data.plan);
          const sStat = normalizeHubBillingStatus(data.status);
          const cancelAtPeriodEnd = data.cancelAtPeriodEnd === true;
          const priceId = typeof data.priceId === "string" ? data.priceId : null;
          const currentPeriodEnd =
            data.currentPeriodEnd &&
            typeof (data.currentPeriodEnd as { toDate?: () => Date }).toDate === "function"
              ? (data.currentPeriodEnd as { toDate: () => Date }).toDate()
              : null;
          const billingUnitAmount =
            typeof data.price === "number" && Number.isFinite(data.price) ? data.price : null;
          const billingCurrency = typeof data.currency === "string" ? data.currency : null;
          if (!isBillingEntitledForPaidFeatures(sStat)) continue;
          if (!chosen || isPlanAtLeast(p, chosen.plan)) {
            chosen = {
              plan: p,
              status: sStat,
              cancelAtPeriodEnd,
              priceId,
              currentPeriodEnd,
              billingUnitAmount,
              billingCurrency,
            };
          }
        }
        setSubBest(chosen);
        setSubTouched(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSubBest(null);
        setSubTouched(true);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const loading = teamLoading || (!!teamId && !subTouched);

  return { billing, loading };
}
