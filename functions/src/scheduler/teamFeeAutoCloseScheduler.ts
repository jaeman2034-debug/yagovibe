import { initializeApp, getApps } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type QuerySnapshot,
  type DocumentData,
} from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { isPastSeoulEndOfDueDay, seoulCalendarFromInstant } from "./seoulDateUtils";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

function seoulYearMonthKey(ms: number): number {
  const { y, M } = seoulCalendarFromInstant(ms);
  return y * 100 + M;
}

/** 달력 월 M(1–12)의 말일 */
function lastDayOfCalendarMonth(y: number, month1to12: number): number {
  return new Date(y, month1to12, 0).getDate();
}

/**
 * 마감월이 지난 회차는 매일 허용.
 * 마감과 같은 서울 달이면: `feeAutoCloseDayOfMonth`(1–31, 31=말일) 이후에만 시도.
 */
function shouldAttemptAutoCloseForFee(nowMs: number, due: Timestamp, closeDayRaw: number): boolean {
  const dueMs = due.toMillis();
  if (seoulYearMonthKey(nowMs) > seoulYearMonthKey(dueMs)) return true;

  const { y, M, d } = seoulCalendarFromInstant(nowMs);
  const last = lastDayOfCalendarMonth(y, M);
  const closeDay = Math.min(Math.max(1, Math.floor(Number(closeDayRaw) || 31)), 31);
  const threshold = Math.min(closeDay, last);
  return d >= threshold;
}

/** `teams/…/payments` feeId 일치 문서가 모두 paid 인지 — 하나라도 아니면 마감 금지 */
function paymentDocsAllPaid(snap: QuerySnapshot<DocumentData>): boolean {
  for (const doc of snap.docs) {
    const st = String(doc.data()?.status ?? "")
      .trim()
      .toLowerCase();
    if (st !== "paid") return false;
  }
  return true;
}

/**
 * 매일 01:00(KST): `settings.feeAutoCloseEnabled` 인 활성 팀만,
 * 마감일(서울) 종료 이후·집계 일정 충족 시 `payments` 전원 paid 인 오픈 회차만 자동 마감.
 */
export const teamFeeAutoCloseScheduler = onSchedule(
  {
    schedule: "0 1 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const nowMs = Date.now();
    let teamsScanned = 0;
    let teamsEnabled = 0;
    let openFeesSeen = 0;
    let closed = 0;
    let wouldCloseDryRun = 0;
    let skipped = 0;
    let errors = 0;

    const teamsSnap = await db.collection("teams").get();

    for (const teamDoc of teamsSnap.docs) {
      teamsScanned += 1;
      const teamId = teamDoc.id;
      const team = (teamDoc.data() || {}) as Record<string, unknown>;
      const teamStatus = String(team.status || "active").toLowerCase();
      if (teamStatus !== "active") continue;

      const settings = (team.settings as Record<string, unknown> | undefined) || {};
      if (settings.feeAutoCloseEnabled !== true) continue;

      teamsEnabled += 1;
      const closeDayRaw =
        typeof settings.feeAutoCloseDayOfMonth === "number" && Number.isFinite(settings.feeAutoCloseDayOfMonth)
          ? settings.feeAutoCloseDayOfMonth
          : 31;
      const dryRun = settings.feeAutoCloseDryRun === true;

      try {
        const feesSnap = await db
          .collection("teams")
          .doc(teamId)
          .collection("fees")
          .where("status", "==", "open")
          .get();

        if (feesSnap.empty) continue;

        const membersSnap = await db
          .collection("teams")
          .doc(teamId)
          .collection("members")
          .where("status", "==", "active")
          .get();
        if (membersSnap.empty) {
          skipped += feesSnap.size;
          logger.info("[teamFeeAutoCloseScheduler] skip team: no active members", { teamId });
          continue;
        }

        for (const feeDoc of feesSnap.docs) {
          openFeesSeen += 1;
          const feeId = feeDoc.id;
          const fee = feeDoc.data();
          const due = fee.dueDate;
          if (!(due instanceof Timestamp)) {
            skipped += 1;
            continue;
          }
          if (!isPastSeoulEndOfDueDay(due, nowMs)) {
            skipped += 1;
            continue;
          }
          if (!shouldAttemptAutoCloseForFee(nowMs, due, closeDayRaw)) {
            skipped += 1;
            continue;
          }

          const paySnap = await db
            .collection("teams")
            .doc(teamId)
            .collection("payments")
            .where("feeId", "==", feeId)
            .get();

          if (paySnap.empty) {
            skipped += 1;
            logger.info("[teamFeeAutoCloseScheduler] skip fee: no payments seeded", { teamId, feeId });
            continue;
          }

          if (!paymentDocsAllPaid(paySnap)) {
            skipped += 1;
            continue;
          }

          if (dryRun) {
            wouldCloseDryRun += 1;
            logger.info("[teamFeeAutoCloseScheduler] [DRY RUN] would close fee", { teamId, feeId });
            continue;
          }

          await feeDoc.ref.update({
            status: "closed",
            closedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          closed += 1;
          logger.info("[teamFeeAutoCloseScheduler] closed fee", { teamId, feeId });
        }
      } catch (e) {
        errors += 1;
        logger.error("[teamFeeAutoCloseScheduler] team loop error", { teamId, err: String(e) });
      }
    }

    logger.info("[teamFeeAutoCloseScheduler] summary", {
      teamsScanned,
      teamsEnabled,
      openFeesSeen,
      closed,
      wouldCloseDryRun,
      skipped,
      errors,
    });
  }
);
