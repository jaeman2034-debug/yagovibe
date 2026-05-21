import { createHash } from "crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import {
  addUtcCalendarDays,
  seoulCalendarFromInstant,
  seoulDateLabel,
  seoulDayToDueDateBounds,
} from "./seoulDateUtils";
import { teamEntitledForBulkFeeReminders } from "../lib/teamPlan";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

type FeePreDueReminderPhase = "d3" | "d1" | "d0";

/** 재시도·부분 실패 시 동일 키로 문서가 겹치지 않도록 — phase 포함 */
function feeReminderNotificationDocId(
  teamId: string,
  feeId: string,
  uid: string,
  dateKey: string,
  phase: FeePreDueReminderPhase
): string {
  const base = `fee_due_${dateKey}_${phase}_${teamId}_${feeId}_${uid}`;
  if (base.length <= 800) return base;
  return `fee_due_${dateKey}_${phase}_${createHash("sha256").update(base).digest("hex")}`;
}

function reminderCopy(
  phase: FeePreDueReminderPhase,
  displayName: string,
  feeTitle: string
): { title: string; body: string } {
  switch (phase) {
    case "d3":
      return {
        title: "회비 납부 3일 전",
        body: `${displayName}님, 「${feeTitle}」납부일이 3일 남았습니다.`,
      };
    case "d1":
      return {
        title: "회비 마감 임박",
        body: `${displayName}님, 「${feeTitle}」회비 마감이 하루 남았습니다.`,
      };
    case "d0":
      return {
        title: "회비 마감일",
        body: `${displayName}님, 오늘이 「${feeTitle}」납부 마감일입니다.`,
      };
    default:
      return { title: "회비 안내", body: `${displayName}님, 「${feeTitle}」회비를 확인해 주세요.` };
  }
}

/** Firestore batch 상한 500 — fee update 1슬롯 예약 */
const MAX_NOTIFS_PER_BATCH = 399;

/**
 * 마감 전 자동 알림 (서울 09:00):
 * - D-3: 납부일 3일 후가 마감인 회비
 * - D-1: 납부일 1일 후가 마감 (기존 동작)
 * - D-0: 오늘이 마감일
 *
 * `teams/.../fees/{feeId}.reminderPhases.{d3|d1|d0}` 로 단계별 멱등.
 * 레거시 `reminderSent === true` 는 D-1 완료로 간주.
 */
export const feeReminderScheduler = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const today = seoulCalendarFromInstant(Date.now());
    const phaseTargets: { phase: FeePreDueReminderPhase; cal: { y: number; M: number; d: number } }[] = [
      { phase: "d3", cal: addUtcCalendarDays(today.y, today.M, today.d, 3) },
      { phase: "d1", cal: addUtcCalendarDays(today.y, today.M, today.d, 1) },
      { phase: "d0", cal: today },
    ];

    logger.info("[feeReminderScheduler] 시작", {
      today: seoulDateLabel(today.y, today.M, today.d),
      targets: phaseTargets.map((t) => ({
        phase: t.phase,
        dueDay: seoulDateLabel(t.cal.y, t.cal.M, t.cal.d),
      })),
    });

    const teamsSnap = await db.collection("teams").get();
    let teamsProcessed = 0;
    let feesTouched = 0;
    let notificationsQueued = 0;
    const byPhase: Record<FeePreDueReminderPhase, { fees: number; notifs: number }> = {
      d3: { fees: 0, notifs: 0 },
      d1: { fees: 0, notifs: 0 },
      d0: { fees: 0, notifs: 0 },
    };

    for (const teamDoc of teamsSnap.docs) {
      teamsProcessed++;
      const teamId = teamDoc.id;
      const teamPayload = teamDoc.data() as Record<string, unknown> | undefined;
      if (!teamEntitledForBulkFeeReminders(teamPayload)) {
        continue;
      }

      for (const { phase, cal } of phaseTargets) {
        const { start, end } = seoulDayToDueDateBounds(cal.y, cal.M, cal.d);
        const dateKey = seoulDateLabel(cal.y, cal.M, cal.d);

        let feesSnap;
        try {
          feesSnap = await db
            .collection("teams")
            .doc(teamId)
            .collection("fees")
            .where("status", "==", "open")
            .where("dueDate", ">=", start)
            .where("dueDate", "<=", end)
            .get();
        } catch (e) {
          logger.error("[feeReminderScheduler] fees 조회 실패", { teamId, phase, error: String(e) });
          continue;
        }

        for (const feeDoc of feesSnap.docs) {
          const feeData = feeDoc.data() as Record<string, unknown>;
          const phases = (feeData.reminderPhases || {}) as Record<string, boolean>;
          if (phases[phase] === true) {
            continue;
          }

          /** 레거시: 예전 스케줄은 `reminderPhases` 없이 `reminderSent` 만 씀 → D-1 완료로 마이그레이션 후 알림 생략 */
          if (phase === "d1" && feeData.reminderSent === true) {
            try {
              await feeDoc.ref.update({
                "reminderPhases.d1": true,
                lastReminderAt: FieldValue.serverTimestamp(),
              });
            } catch (e) {
              logger.warn("[feeReminderScheduler] legacy d1 마이그레이션 실패", {
                teamId,
                feeId: feeDoc.id,
                error: String(e),
              });
            }
            continue;
          }

          feesTouched++;
          byPhase[phase].fees++;
          const feeId = feeDoc.id;
          const feeTitle = String(feeData.title || "팀 회비");

          const [membersSnap, paymentsSnap] = await Promise.all([
            db.collection("teams").doc(teamId).collection("members").where("status", "==", "active").get(),
            db.collection("teams").doc(teamId).collection("payments").where("feeId", "==", feeId).get(),
          ]);

          const paymentMap = new Map<string, Record<string, unknown>>();
          paymentsSnap.docs.forEach((p) => {
            const d = p.data() as Record<string, unknown>;
            const uid = typeof d.userId === "string" && d.userId ? d.userId : "";
            if (uid) paymentMap.set(uid, d);
          });

          type UnpaidRow = { uid: string; displayName: string };
          const unpaid: UnpaidRow[] = [];

          for (const memberDoc of membersSnap.docs) {
            const uid = memberDoc.id;
            const member = memberDoc.data() as Record<string, unknown>;
            const payment = paymentMap.get(uid);
            if (payment?.status === "paid") continue;

            const displayName =
              (typeof member.name === "string" && member.name.trim()) ||
              (typeof member.displayName === "string" && member.displayName.trim()) ||
              "회원";
            unpaid.push({ uid, displayName });
          }

          const feeStateUpdate: Record<string, unknown> = {
            lastReminderAt: FieldValue.serverTimestamp(),
            [`reminderPhases.${phase}`]: true,
          };

          if (unpaid.length === 0) {
            await feeDoc.ref.update(feeStateUpdate);
            continue;
          }

          let idx = 0;
          while (idx < unpaid.length) {
            const remaining = unpaid.length - idx;
            const isFinalBatch = remaining <= MAX_NOTIFS_PER_BATCH;
            const take = isFinalBatch ? remaining : MAX_NOTIFS_PER_BATCH;

            const batch = db.batch();
            for (let j = 0; j < take; j++) {
              const row = unpaid[idx + j];
              const { title, body } = reminderCopy(phase, row.displayName, feeTitle);
              const docId = feeReminderNotificationDocId(teamId, feeId, row.uid, dateKey, phase);
              const notifRef = db.collection("notifications").doc(docId);
              batch.set(
                notifRef,
                {
                  type: "fee_due_reminder",
                  teamId,
                  feeId,
                  feeReminderPhase: phase,
                  correlationId: buildFeePaymentCorrelationId(feeId, row.uid),
                  targetUid: row.uid,
                  userId: row.uid,
                  title,
                  body,
                  link: `/team/${encodeURIComponent(teamId)}?tab=home`,
                  status: "queued",
                  pushDedupKey: `fee_due_reminder:${teamId}:${feeId}:${row.uid}:${dateKey}:${phase}`,
                  createdAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
              notificationsQueued++;
              byPhase[phase].notifs++;
            }
            if (isFinalBatch) {
              batch.update(feeDoc.ref, feeStateUpdate);
            }
            await batch.commit();
            idx += take;
          }
        }
      }
    }

    logger.info("[feeReminderScheduler] 완료", {
      teamsProcessed,
      feesTouched,
      notificationsQueued,
      byPhase,
    });
  }
);
