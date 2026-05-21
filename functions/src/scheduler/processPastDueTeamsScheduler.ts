/**
 * Stripe past_due 팀: Day3 재알림, graceUntil 경과 시 billingRestricted 전환 + 알림.
 * - Webhook에서 Day0 즉시 알림·pastDueSince/graceUntil 설정
 * - 복구(결제 성공)는 Webhook이 billingRestricted 해제
 */
import * as admin from "firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { normalizeBillingStatus } from "../lib/teamPlan";
import { resolveTeamCaptainUid } from "../lib/resolveTeamCaptainUid";
import {
  enqueueBillingLifecycleNotification,
  PAST_DUE_DAY3_REMINDER_MS,
  PAST_DUE_GRACE_PERIOD_MS,
  teamBillingDeepLink,
} from "../lib/teamBillingPastDue";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const TEAMS_PAGE_SIZE = 400;

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

export const processPastDueTeamsScheduler = onSchedule(
  {
    schedule: "30 10 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const now = Date.now();
    let scanned = 0;
    let day3Sent = 0;
    let restricted = 0;
    let skipped = 0;
    let errors = 0;

    let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined;

    for (;;) {
      let q = db.collection("teams").orderBy(FieldPath.documentId()).limit(TEAMS_PAGE_SIZE);
      if (lastDoc) {
        q = q.startAfter(lastDoc);
      }
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

        if (normalizeBillingStatus(d.billingStatus) !== "past_due") {
          skipped++;
          continue;
        }

        if (d.billingRestricted === true) {
          skipped++;
          continue;
        }

        const pastDueSinceMs = millisFromTs(d.pastDueSince);
        if (pastDueSinceMs == null) {
          skipped++;
          continue;
        }

        const graceMs =
          millisFromTs(d.graceUntil) ?? pastDueSinceMs + PAST_DUE_GRACE_PERIOD_MS;
        const episodeKey = String(pastDueSinceMs);

        const teamName =
          (typeof d.name === "string" && d.name.trim()) ||
          (typeof d.teamName === "string" && d.teamName.trim()) ||
          "팀";
        const link = teamBillingDeepLink(teamId);

        try {
          if (now >= graceMs) {
            const captain = await resolveTeamCaptainUid(teamId, d).catch(() => null);
            const batch = db.batch();
            batch.update(teamDoc.ref, {
              billingRestricted: true,
              restrictedAt: FieldValue.serverTimestamp(),
              billingRestrictionReason: "payment_failed",
              ...teamDocumentActivityPatch(),
            });
            if (captain) {
              batch.set(
                db.collection("notifications").doc(`billing_restricted_${teamId}_${episodeKey}`),
                {
                  type: "billing_restricted",
                  teamId,
                  targetUid: captain,
                  userId: captain,
                  title: "[이용 제한]",
                  body:
                    `「${teamName}」 결제가 확인되지 않아 일부 기능이 제한되었습니다.\n` +
                    `결제를 완료하면 자동으로 정상화됩니다.`,
                  link,
                  status: "queued",
                  pushDedupKey: `billing_restricted:${teamId}:${episodeKey}`,
                  createdAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            }
            await batch.commit();
            restricted++;
            continue;
          }

          if (now - pastDueSinceMs >= PAST_DUE_DAY3_REMINDER_MS) {
            const lastRem = millisFromTs(d.lastPastDueReminderAt);
            const reminderForThisEpisode = lastRem == null || lastRem < pastDueSinceMs;
            if (!reminderForThisEpisode) {
              skipped++;
              continue;
            }

            const captain = await resolveTeamCaptainUid(teamId, d).catch(() => null);
            if (!captain) {
              skipped++;
              continue;
            }

            await enqueueBillingLifecycleNotification({
              docId: `billing_past_due_day3_${teamId}_${episodeKey}`,
              pushDedupKey: `billing_past_due_day3:${teamId}:${episodeKey}`,
              teamId,
              captainUid: captain,
              notifType: "billing_past_due_day3",
              title: "[결제 재안내]",
              body:
                `「${teamName}」 아직 결제가 완료되지 않았습니다.\n` +
                `이용 제한 전에 결제 수단을 확인해 주세요.`,
              link,
            });

            await teamDoc.ref.update({
              lastPastDueReminderAt: FieldValue.serverTimestamp(),
              ...teamDocumentActivityPatch(),
            });
            day3Sent++;
          } else {
            skipped++;
          }
        } catch (e) {
          errors++;
          logger.error("[processPastDueTeamsScheduler] team failed", {
            teamId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < TEAMS_PAGE_SIZE) break;
    }

    logger.info("[processPastDueTeamsScheduler] done", {
      scanned,
      day3Sent,
      restricted,
      skipped,
      errors,
    });
  }
);
