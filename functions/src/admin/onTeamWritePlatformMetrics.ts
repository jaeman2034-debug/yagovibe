/**
 * teams/{teamId} 변경 시 platformMetrics/current 카운터만 증감 (스케줄 full_rebuild로 정합성 복구).
 */
import * as admin from "firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { normalizeBillingStatus, normalizeTeamPlan } from "../lib/teamPlan";
import { bumpTeamNotificationExperimentMetric } from "../lib/notificationExperimentMetrics";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const METRICS_DOC = "platformMetrics/current";
const THIRTY_DAYS_MS = 30 * 86400000;

function millisFromUpdated(raw: unknown): number | null {
  if (raw && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as admin.firestore.Timestamp).toMillis();
  }
  return null;
}

/** 30일 이상 무보다가 갱신된 경우 → 리텐션 측정용 */
async function maybeRecordTeamReactivation(
  teamId: string,
  afterRef: admin.firestore.DocumentReference,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  const nowMs = Date.now();
  const bu = millisFromUpdated(before.updatedAt);
  const au = millisFromUpdated(after.updatedAt);
  const wasStale = bu === null || nowMs - bu > THIRTY_DAYS_MS;
  const nowFresh = au !== null && nowMs - au <= THIRTY_DAYS_MS;
  const progressed = au !== null && (bu === null || au > bu);
  if (!wasStale || !nowFresh || !progressed) {
    return;
  }
  try {
    const batch = db.batch();
    batch.update(afterRef, {
      lastReactivatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    const applyExperimentReactivated = async (
      experimentIdRaw: unknown,
      variantRaw: unknown,
      cohortRaw: unknown
    ): Promise<void> => {
      const experimentId = typeof experimentIdRaw === "string" ? experimentIdRaw : "";
      const variant = variantRaw === "A" || variantRaw === "B" ? variantRaw : null;
      const cohort = cohortRaw === "new" || cohortRaw === "existing" ? cohortRaw : null;
      if (!experimentId || !variant) return;
      await bumpTeamNotificationExperimentMetric(db, teamId, experimentId, variant, "reactivated");
      if (cohort) {
        const cohortVariantKey = variant === "A" ? "reactivatedVariantA" : "reactivatedVariantB";
        await db.doc(`teams/${teamId}/experiments/${experimentId}`).set(
          {
            [`cohort.${cohort}.${cohortVariantKey}`]: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    };

    await applyExperimentReactivated(after.highRiskDay0ExperimentId, after.highRiskDay0Variant, after.highRiskDay0Cohort);
    await applyExperimentReactivated(after.highRiskDay3ExperimentId, after.highRiskDay3Variant, after.highRiskDay3Cohort);
  } catch (e) {
    logger.warn("[onTeamWritePlatformMetrics] lastReactivatedAt update skipped", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

function countsForTeam(d: Record<string, unknown> | null | undefined): {
  pastDue: number;
  healthy: number;
  free: number;
  restricted: number;
} {
  if (!d) return { pastDue: 0, healthy: 0, free: 0, restricted: 0 };
  const billing = normalizeBillingStatus(d.billingStatus);
  const pastDue = billing === "past_due" ? 1 : 0;
  const healthy = billing === "active" || billing === "trialing" ? 1 : 0;
  const free = normalizeTeamPlan(d.plan) === "free" ? 1 : 0;
  const restricted = d.billingRestricted === true ? 1 : 0;
  return { pastDue, healthy, free, restricted };
}

function safeMemberCount(d: Record<string, unknown> | null | undefined): number {
  if (!d) return 0;
  const n = Math.floor(Number(d.memberCount ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const onTeamWritePlatformMetrics = onDocumentWritten(
  {
    document: "teams/{teamId}",
    region: "asia-northeast3",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    const before = beforeSnap?.exists ? (beforeSnap.data() as Record<string, unknown>) : null;
    const after = afterSnap?.exists ? (afterSnap.data() as Record<string, unknown>) : null;

    const teamId = event.params?.teamId as string | undefined;
    if (before && after && afterSnap?.ref && teamId) {
      await maybeRecordTeamReactivation(teamId, afterSnap.ref, before, after);
    }

    if (before && after) {
      const bc = countsForTeam(before);
      const ac = countsForTeam(after);
      const dPast = ac.pastDue - bc.pastDue;
      const dHealthy = ac.healthy - bc.healthy;
      const dFree = ac.free - bc.free;
      const dRestricted = ac.restricted - bc.restricted;
      const dMembers = safeMemberCount(after) - safeMemberCount(before);
      if (dPast === 0 && dHealthy === 0 && dFree === 0 && dRestricted === 0 && dMembers === 0) {
        return;
      }
    }

    const metricsRef = db.doc(METRICS_DOC);
    const patch: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      source: "incremental",
    };

    if (!before && after) {
      patch.totalTeams = FieldValue.increment(1);
      const c = countsForTeam(after);
      if (c.pastDue) patch.pastDueTeams = FieldValue.increment(1);
      if (c.healthy) patch.billingHealthyTeams = FieldValue.increment(1);
      if (c.free) patch.freeTeams = FieldValue.increment(1);
      if (c.restricted) patch.restrictedTeams = FieldValue.increment(1);
      const mc = safeMemberCount(after);
      if (mc) patch.totalMembers = FieldValue.increment(mc);
    } else if (before && !after) {
      patch.totalTeams = FieldValue.increment(-1);
      const c = countsForTeam(before);
      if (c.pastDue) patch.pastDueTeams = FieldValue.increment(-1);
      if (c.healthy) patch.billingHealthyTeams = FieldValue.increment(-1);
      if (c.free) patch.freeTeams = FieldValue.increment(-1);
      if (c.restricted) patch.restrictedTeams = FieldValue.increment(-1);
      const mc = safeMemberCount(before);
      if (mc) patch.totalMembers = FieldValue.increment(-mc);
    } else if (before && after) {
      const bc = countsForTeam(before);
      const ac = countsForTeam(after);
      const dPast = ac.pastDue - bc.pastDue;
      const dHealthy = ac.healthy - bc.healthy;
      const dFree = ac.free - bc.free;
      const dRestricted = ac.restricted - bc.restricted;
      if (dPast !== 0) patch.pastDueTeams = FieldValue.increment(dPast);
      if (dHealthy !== 0) patch.billingHealthyTeams = FieldValue.increment(dHealthy);
      if (dFree !== 0) patch.freeTeams = FieldValue.increment(dFree);
      if (dRestricted !== 0) patch.restrictedTeams = FieldValue.increment(dRestricted);
      const dMembers = safeMemberCount(after) - safeMemberCount(before);
      if (dMembers !== 0) patch.totalMembers = FieldValue.increment(dMembers);
    }

    try {
      await metricsRef.set(patch, { merge: true });
    } catch (e) {
      logger.error("[onTeamWritePlatformMetrics] set failed", {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
);
