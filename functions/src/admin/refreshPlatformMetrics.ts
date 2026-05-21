/**
 * 플랫폼 운영 KPI → `platformMetrics/current`
 * - full_rebuild: teams 페이지 스캔 + 정확한 시간 기반 지표
 * - incremental: {@link onTeamWritePlatformMetrics} 가 카운터만 보조
 */
import * as admin from "firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { normalizeBillingStatus, normalizeTeamPlan } from "../lib/teamPlan";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const METRICS_DOC_ID = "current";
const TEAMS_PAGE_SIZE = 2500;

export type PlatformMetricsPlain = {
  totalFederations: number;
  totalTeams: number;
  billingHealthyTeams: number;
  pastDueTeams: number;
  restrictedTeams: number;
  activeTeams7d: number;
  inactiveTeams7d: number;
  activeTeams30d: number;
  inactiveTeams30d: number;
  freeTeams: number;
  totalMembers: number;
  pastDueTeamIds: string[];
  restrictedTeamIds: string[];
  inactiveTeamIds: string[];
  highRiskTeams: number;
  highRiskTeamIds: string[];
  highRiskDay0Teams: number;
  highRiskDay3Teams: number;
  highRiskDay7Teams: number;
  /** full_rebuild 스캔에는 포함하지 않음 — Stripe 웹훅이 `increment` 로만 유지 */
  recentRecoveredBillingTeams?: number;
  /** {@link rollupBillingRecoveryMetricsScheduler} 가 `billingRecoveryEvents` 기준으로 갱신 */
  recentRecoveredBillingTeams7d?: number;
  recentRecoveredBillingTeams30d?: number;
  /** active+trialing 팀의 `mrr` 합(Stripe minor unit, 통화 혼합 가능) */
  totalMRR?: number;
  totalMRRByCurrency?: Record<string, number>;
  activeSubscriptions?: number;
  /** {@link rollupChurnConversionMetricsScheduler} */
  churnedSubscriptions7d?: number;
  churnedSubscriptions30d?: number;
  trialToPaidConversions7d?: number;
  trialToPaidConversions30d?: number;
  source: "full_rebuild";
};

async function assertPlatformAdmin(uid: string, token: Record<string, unknown> | undefined): Promise<void> {
  const tokenAdmin = token?.admin === true;
  const tokenRoleRaw =
    typeof token?.role === "string" ? String(token.role).trim() : "";
  const tokenRoleAdmin =
    tokenRoleRaw.length > 0 && tokenRoleRaw.toUpperCase() === "ADMIN";

  if (tokenAdmin || tokenRoleAdmin) {
    logger.info("AUTH DEBUG refreshPlatformMetrics", {
      uid,
      tokenAdmin,
      tokenRole: tokenRoleRaw || null,
      roleFromFirestore: null,
      via: tokenAdmin ? "token.admin" : "token.role",
    });
    return;
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  const roleFromFirestore = String(
    userSnap.exists ? (userSnap.data() as Record<string, unknown>)?.role || "" : ""
  ).trim();
  const roleUpper = roleFromFirestore.toUpperCase();

  logger.info("AUTH DEBUG refreshPlatformMetrics", {
    uid,
    tokenAdmin,
    tokenRole: tokenRoleRaw || null,
    roleFromFirestore: roleFromFirestore || null,
    via: roleUpper === "ADMIN" ? "users.role" : "none",
  });

  if (roleUpper === "ADMIN") {
    return;
  }
  throw new HttpsError(
    "permission-denied",
    "플랫폼 관리자만 집계를 갱신할 수 있습니다. (Custom Claim admin=true 또는 users.role = ADMIN)"
  );
}

function millisFromUpdated(raw: unknown): number | null {
  if (raw && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as admin.firestore.Timestamp).toMillis();
  }
  return null;
}

async function computePlatformMetricsFullRebuild(): Promise<PlatformMetricsPlain> {
  const fedRefs = await db.collection("federations").listDocuments();
  const totalFederations = fedRefs.length;

  const now = Date.now();
  const sevenDaysMs = 7 * 86400000;
  const thirtyDaysMs = 30 * 86400000;

  let totalTeams = 0;
  let billingHealthy = 0;
  let pastDueTeams = 0;
  let restrictedTeams = 0;
  let activeTeams7d = 0;
  let inactiveTeams7d = 0;
  let activeTeams30d = 0;
  let inactiveTeams30d = 0;
  let freeTeams = 0;
  let totalMembers = 0;
  let totalMrrMinor = 0;
  const totalMrrByCurrency: Record<string, number> = {};
  let activeSubscriptions = 0;
  let highRiskTeams = 0;
  let highRiskDay0Teams = 0;
  let highRiskDay3Teams = 0;
  let highRiskDay7Teams = 0;
  const pastDueTeamIds: string[] = [];
  const restrictedTeamIds: string[] = [];
  const inactiveTeamIds: string[] = [];
  const highRiskTeamIds: string[] = [];

  let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined;

  for (;;) {
    let q = db.collection("teams").orderBy(FieldPath.documentId()).limit(TEAMS_PAGE_SIZE);
    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }
    const snap = await q.get();
    if (snap.empty) {
      break;
    }

    for (const doc of snap.docs) {
      totalTeams++;
      const d = doc.data() as Record<string, unknown>;
      const billing = normalizeBillingStatus(d.billingStatus);
      const plan = normalizeTeamPlan(d.plan);

      if (plan === "free") {
        freeTeams++;
      }
      if (billing === "active" || billing === "trialing") {
        billingHealthy++;
      }
      if (billing === "past_due") {
        pastDueTeams++;
        if (pastDueTeamIds.length < 40) pastDueTeamIds.push(doc.id);
      }
      if (d.billingRestricted === true) {
        restrictedTeams++;
        if (restrictedTeamIds.length < 40) restrictedTeamIds.push(doc.id);
      }

      if (billing === "active" || billing === "trialing") {
        const hasSub =
          typeof d.stripeSubscriptionId === "string" && String(d.stripeSubscriptionId).trim().length > 0;
        if (hasSub) {
          activeSubscriptions++;
        }
        const mrrMinor = Math.floor(Number(d.mrr ?? 0));
        if (Number.isFinite(mrrMinor) && mrrMinor > 0) {
          totalMrrMinor += mrrMinor;
          const c = String(d.billingCurrency || "").trim().toUpperCase();
          if (c) {
            totalMrrByCurrency[c] = (totalMrrByCurrency[c] ?? 0) + mrrMinor;
          }
        }
      }

      const mc = Math.floor(Number(d.memberCount ?? 0));
      if (Number.isFinite(mc) && mc > 0) {
        totalMembers += mc;
      }

      const updatedMs = millisFromUpdated(d.updatedAt);
      const isInactive30 = updatedMs == null || now - updatedMs > thirtyDaysMs;
      if (billing === "past_due" && isInactive30) {
        highRiskTeams++;
        if (highRiskTeamIds.length < 40) highRiskTeamIds.push(doc.id);
      }
      if (isInactive30 && typeof d.lastHighRiskStage === "string") {
        const st = String(d.lastHighRiskStage);
        if (st === "day0") highRiskDay0Teams++;
        if (st === "day3") highRiskDay3Teams++;
        if (st === "day7") highRiskDay7Teams++;
      }
      if (updatedMs != null) {
        if (now - updatedMs <= sevenDaysMs) {
          activeTeams7d++;
        } else {
          inactiveTeams7d++;
        }
        if (now - updatedMs <= thirtyDaysMs) {
          activeTeams30d++;
        } else {
          inactiveTeams30d++;
        }
        if (now - updatedMs > thirtyDaysMs && inactiveTeamIds.length < 40) {
          inactiveTeamIds.push(doc.id);
        }
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < TEAMS_PAGE_SIZE) {
      break;
    }
  }

  const prevSnap = await db.doc(`platformMetrics/${METRICS_DOC_ID}`).get();
  const prevData = prevSnap.exists ? (prevSnap.data() as Record<string, unknown>) : {};
  const numOrZero = (v: unknown): number => {
    const n = Math.floor(Number(v ?? 0));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const recentRecoveredBillingTeams = numOrZero(prevData.recentRecoveredBillingTeams);
  const recentRecoveredBillingTeams7d = numOrZero(prevData.recentRecoveredBillingTeams7d);
  const recentRecoveredBillingTeams30d = numOrZero(prevData.recentRecoveredBillingTeams30d);
  const churnedSubscriptions7d = numOrZero(prevData.churnedSubscriptions7d);
  const churnedSubscriptions30d = numOrZero(prevData.churnedSubscriptions30d);
  const trialToPaidConversions7d = numOrZero(prevData.trialToPaidConversions7d);
  const trialToPaidConversions30d = numOrZero(prevData.trialToPaidConversions30d);

  return {
    totalFederations,
    totalTeams,
    billingHealthyTeams: billingHealthy,
    pastDueTeams,
    restrictedTeams,
    activeTeams7d,
    inactiveTeams7d,
    activeTeams30d,
    inactiveTeams30d,
    freeTeams,
    totalMembers,
    pastDueTeamIds,
    restrictedTeamIds,
    inactiveTeamIds,
    highRiskTeams,
    highRiskTeamIds,
    highRiskDay0Teams,
    highRiskDay3Teams,
    highRiskDay7Teams,
    recentRecoveredBillingTeams,
    recentRecoveredBillingTeams7d,
    recentRecoveredBillingTeams30d,
    totalMRR: totalMrrMinor,
    totalMRRByCurrency: totalMrrByCurrency,
    activeSubscriptions,
    churnedSubscriptions7d,
    churnedSubscriptions30d,
    trialToPaidConversions7d,
    trialToPaidConversions30d,
    source: "full_rebuild",
  };
}

async function writePlatformMetricsFull(plain: PlatformMetricsPlain): Promise<void> {
  await db.doc(`platformMetrics/${METRICS_DOC_ID}`).set(
    {
      ...plain,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export const refreshPlatformMetrics = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 540, memory: "1GiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    await assertPlatformAdmin(request.auth.uid, request.auth.token as Record<string, unknown>);

    const plain = await computePlatformMetricsFullRebuild();
    await writePlatformMetricsFull(plain);

    return { ok: true, ...plain, refreshedAt: new Date().toISOString() };
  }
);

export const refreshPlatformMetricsScheduled = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async () => {
    try {
      const plain = await computePlatformMetricsFullRebuild();
      await writePlatformMetricsFull(plain);
      logger.info("[refreshPlatformMetricsScheduled] ok", {
        totalTeams: plain.totalTeams,
        pastDueTeams: plain.pastDueTeams,
        restrictedTeams: plain.restrictedTeams,
        totalMRR: plain.totalMRR,
        activeSubscriptions: plain.activeSubscriptions,
        source: plain.source,
      });
    } catch (e) {
      logger.error("[refreshPlatformMetricsScheduled] failed", {
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  }
);
