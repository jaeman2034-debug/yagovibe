/**
 * inactive(30d)+billing 문제 팀 자동 개입:
 * - Day0: inactive + past_due 첫 감지
 * - Day3: 3일 경과, 여전히 inactive + past_due
 * - Day7: 7일 경과, inactive + restricted
 */
import * as admin from "firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { normalizeBillingStatus } from "../lib/teamPlan";
import { resolveTeamCaptainUid } from "../lib/resolveTeamCaptainUid";
import { enqueueBillingLifecycleNotification, teamBillingDeepLink } from "../lib/teamBillingPastDue";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const TEAMS_PAGE_SIZE = 400;
const THIRTY_DAYS_MS = 30 * 86400000;
const DAY3_MS = 3 * 86400000;
const DAY7_MS = 7 * 86400000;

type HighRiskStage = "day0" | "day3" | "day7";
const HIGH_RISK_DAY0_EXPERIMENT = "high_risk_day0_v1";
const HIGH_RISK_DAY3_EXPERIMENT = "high_risk_day3_v1";

function millisFromTs(raw: unknown): number | null {
  if (raw && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as admin.firestore.Timestamp).toMillis();
  }
  return null;
}

function isTeamDisbanded(teamData: Record<string, unknown>): boolean {
  const s = String(teamData.status || "").toUpperCase();
  return s === "DISBANDED" || s === "DELETED" || s === "ARCHIVED";
}

function pickVariantFromTeamId(teamId: string): "A" | "B" {
  let h = 0;
  for (let i = 0; i < teamId.length; i++) {
    h = (h * 31 + teamId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2 === 0 ? "A" : "B";
}

function cohortFromTeamCreatedAt(nowMs: number, createdAtRaw: unknown): "new" | "existing" {
  const createdMs = millisFromTs(createdAtRaw);
  if (createdMs == null) return "existing";
  return nowMs - createdMs <= THIRTY_DAYS_MS ? "new" : "existing";
}

export const processHighRiskTeamsScheduler = onSchedule(
  {
    schedule: "0 11 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const now = Date.now();
    const [day0DecisionSnap, day3DecisionSnap] = await Promise.all([
      db.doc(`experimentDecisions/${HIGH_RISK_DAY0_EXPERIMENT}`).get(),
      db.doc(`experimentDecisions/${HIGH_RISK_DAY3_EXPERIMENT}`).get(),
    ]);
    const day0Decision = day0DecisionSnap.exists ? (day0DecisionSnap.data() as Record<string, unknown>) : null;
    const day3Decision = day3DecisionSnap.exists ? (day3DecisionSnap.data() as Record<string, unknown>) : null;
    const day0RolloutWinner = day0Decision?.winner === "A" || day0Decision?.winner === "B" ? day0Decision.winner : null;
    const day3RolloutWinner = day3Decision?.winner === "A" || day3Decision?.winner === "B" ? day3Decision.winner : null;
    let scanned = 0;
    let day0Sent = 0;
    let day3Sent = 0;
    let day7Sent = 0;
    let cleared = 0;
    let skipped = 0;
    let errors = 0;

    let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined;

    for (;;) {
      let q = db.collection("teams").orderBy(FieldPath.documentId()).limit(TEAMS_PAGE_SIZE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      for (const teamDoc of snap.docs) {
        scanned++;
        const teamId = teamDoc.id;
        const d = teamDoc.data() as Record<string, unknown>;
        if (isTeamDisbanded(d)) {
          skipped++;
          continue;
        }

        const billing = normalizeBillingStatus(d.billingStatus);
        const updatedMs = millisFromTs(d.updatedAt);
        const inactive30 = updatedMs == null || now - updatedMs > THIRTY_DAYS_MS;
        const restricted = d.billingRestricted === true;
        const isHighRisk = inactive30 && (billing === "past_due" || restricted);
        const hadRiskState = d.highRiskDetectedAt != null || d.lastHighRiskStage != null || d.lastHighRiskNotifiedAt != null;

        try {
          if (!isHighRisk) {
            if (hadRiskState) {
              await teamDoc.ref.set(
                {
                  highRiskDetectedAt: FieldValue.delete(),
                  lastHighRiskNotifiedAt: FieldValue.delete(),
                  lastHighRiskStage: FieldValue.delete(),
                  highRiskDay0ExperimentId: FieldValue.delete(),
                  highRiskDay0Variant: FieldValue.delete(),
                  highRiskDay0Cohort: FieldValue.delete(),
                  highRiskDay3ExperimentId: FieldValue.delete(),
                  highRiskDay3Variant: FieldValue.delete(),
                  highRiskDay3Cohort: FieldValue.delete(),
                  ...teamDocumentActivityPatch(),
                },
                { merge: true }
              );
              cleared++;
            } else {
              skipped++;
            }
            continue;
          }

          const detectedMsExisting = millisFromTs(d.highRiskDetectedAt);
          const detectedMs = detectedMsExisting ?? now;
          const elapsed = now - detectedMs;
          let targetStage: HighRiskStage | null = null;

          if (restricted && elapsed >= DAY7_MS) {
            targetStage = "day7";
          } else if (billing === "past_due" && elapsed >= DAY3_MS) {
            targetStage = "day3";
          } else if (billing === "past_due") {
            targetStage = "day0";
          }

          if (!targetStage) {
            skipped++;
            continue;
          }

          const lastStage = typeof d.lastHighRiskStage === "string" ? (d.lastHighRiskStage as HighRiskStage) : null;
          if (lastStage === targetStage) {
            skipped++;
            continue;
          }

          const captainUid = await resolveTeamCaptainUid(teamId, d).catch(() => null);
          const basePatch: Record<string, unknown> = {
            highRiskDetectedAt: detectedMsExisting == null ? FieldValue.serverTimestamp() : d.highRiskDetectedAt,
            lastHighRiskNotifiedAt: FieldValue.serverTimestamp(),
            lastHighRiskStage: targetStage,
            ...teamDocumentActivityPatch(),
          };

          if (!captainUid) {
            await teamDoc.ref.set(basePatch, { merge: true });
            skipped++;
            continue;
          }

          const teamName =
            (typeof d.name === "string" && d.name.trim()) ||
            (typeof d.teamName === "string" && d.teamName.trim()) ||
            "팀";
          const episodeKey = String(detectedMs);
          const link = teamBillingDeepLink(teamId);

          if (targetStage === "day0") {
            const variant = day0RolloutWinner ?? pickVariantFromTeamId(teamId);
            const cohort = cohortFromTeamCreatedAt(now, d.createdAt);
            const bodyA =
              `「${teamName}」 최근 활동이 없고 결제도 미완료 상태입니다.\n` +
              `지금 조치하지 않으면 서비스 이용이 제한될 수 있습니다.`;
            const bodyB =
              `「${teamName}」 지금 팀을 다시 활성화하세요.\n` +
              `[일정 추가] 또는 [결제 확인]으로 바로 시작할 수 있습니다.`;
            await enqueueBillingLifecycleNotification({
              docId: `high_risk_day0_${teamId}_${episodeKey}`,
              pushDedupKey: `high_risk:${teamId}:${episodeKey}:day0`,
              teamId,
              captainUid,
              notifType: "high_risk_day0",
              title: "[운영 위험 감지]",
              body: variant === "A" ? bodyA : bodyB,
              link,
              experiment: HIGH_RISK_DAY0_EXPERIMENT,
              variant,
              cohort,
            });
            await db.doc(`teams/${teamId}/experiments/${HIGH_RISK_DAY0_EXPERIMENT}`).set(
              {
                [`cohort.${cohort}.${variant === "A" ? "sentVariantA" : "sentVariantB"}`]: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            basePatch.highRiskDay0ExperimentId = HIGH_RISK_DAY0_EXPERIMENT;
            basePatch.highRiskDay0Variant = variant;
            basePatch.highRiskDay0Cohort = cohort;
            day0Sent++;
          } else if (targetStage === "day3") {
            const variant = day3RolloutWinner ?? pickVariantFromTeamId(teamId);
            const cohort = cohortFromTeamCreatedAt(now, d.createdAt);
            const bodyA =
              `「${teamName}」 아직 활동과 결제가 모두 확인되지 않았습니다.\n` +
              `계속될 경우 팀 운영이 제한될 수 있습니다.`;
            const bodyB =
              `「${teamName}」 지금 바로 복구할 수 있습니다.\n` +
              `결제 확인 또는 일정/회비 추가로 즉시 정상화할 수 있습니다.`;
            await enqueueBillingLifecycleNotification({
              docId: `high_risk_day3_${teamId}_${episodeKey}`,
              pushDedupKey: `high_risk:${teamId}:${episodeKey}:day3`,
              teamId,
              captainUid,
              notifType: "high_risk_day3",
              title: variant === "A" ? "[이용 제한 임박]" : "[지금 바로 복구 가능]",
              body: variant === "A" ? bodyA : bodyB,
              link,
              experiment: HIGH_RISK_DAY3_EXPERIMENT,
              variant,
              cohort,
            });
            await db.doc(`teams/${teamId}/experiments/${HIGH_RISK_DAY3_EXPERIMENT}`).set(
              {
                [`cohort.${cohort}.${variant === "A" ? "sentVariantA" : "sentVariantB"}`]: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            basePatch.highRiskDay3ExperimentId = HIGH_RISK_DAY3_EXPERIMENT;
            basePatch.highRiskDay3Variant = variant;
            basePatch.highRiskDay3Cohort = cohort;
            day3Sent++;
          } else {
            await enqueueBillingLifecycleNotification({
              docId: `high_risk_day7_${teamId}_${episodeKey}`,
              pushDedupKey: `high_risk:${teamId}:${episodeKey}:day7`,
              teamId,
              captainUid,
              notifType: "high_risk_day7",
              title: "[강한 경고]",
              body:
                `「${teamName}」 결제 미완료로 기능이 제한되었습니다.\n` +
                `지금 결제를 완료하면 즉시 정상화됩니다.`,
              link,
            });
            day7Sent++;
          }

          await teamDoc.ref.set(basePatch, { merge: true });
        } catch (e) {
          errors++;
          logger.error("[processHighRiskTeamsScheduler] team failed", {
            teamId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < TEAMS_PAGE_SIZE) break;
    }

    logger.info("[processHighRiskTeamsScheduler] done", {
      day0RolloutWinner,
      day3RolloutWinner,
      scanned,
      day0Sent,
      day3Sent,
      day7Sent,
      cleared,
      skipped,
      errors,
    });
  }
);

