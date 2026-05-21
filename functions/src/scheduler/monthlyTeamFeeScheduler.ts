import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const DEFAULT_MONTHLY_FEE_AMOUNT = 25000;
const DEFAULT_DUE_DAY = 10;
const MIN_FEE_AMOUNT = 1000;
const SYSTEM_CREATED_BY = "system_monthly_scheduler";

function getMonthlyFeeAmount(team: Record<string, unknown>): number {
  const feeConfig = (team.feeConfig as Record<string, unknown> | undefined) || {};
  const feePolicy = (team.feePolicy as Record<string, unknown> | undefined) || {};
  const candidates = [
    feeConfig.monthlyAmount,
    feePolicy.monthly,
    team.monthlyFeeAmount,
    team.feeAmount,
    DEFAULT_MONTHLY_FEE_AMOUNT,
  ];
  for (const raw of candidates) {
    const n = Math.floor(Number(raw));
    if (Number.isFinite(n) && n >= MIN_FEE_AMOUNT) return n;
  }
  return DEFAULT_MONTHLY_FEE_AMOUNT;
}

function getDueDay(team: Record<string, unknown>): number {
  const feeConfig = (team.feeConfig as Record<string, unknown> | undefined) || {};
  const candidates = [feeConfig.dueDay, team.monthlyFeeDueDay, DEFAULT_DUE_DAY];
  for (const raw of candidates) {
    const day = Math.floor(Number(raw));
    if (Number.isFinite(day) && day >= 1 && day <= 28) return day;
  }
  return DEFAULT_DUE_DAY;
}

function currentSeoulYearMonth(now = new Date()): { year: number; month: number; key: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  })
    .format(now)
    .split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const key = `${parts[0]}-${parts[1]}`;
  return { year, month, key };
}

/**
 * 매달 1일 00:00(KST): 활성 팀에 월 회비 차수 자동 생성.
 * 중복 방지: 같은 monthKey(autoMonthKey) 문서가 이미 있으면 skip.
 */
export const monthlyTeamFeeScheduler = onSchedule(
  {
    schedule: "0 0 1 * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const { year, month, key: monthKey } = currentSeoulYearMonth();
    const dueDate = Timestamp.fromDate(new Date(year, month - 1, 1, 12, 0, 0));
    logger.info("[monthlyTeamFeeScheduler] 시작", { monthKey });

    const teamsSnap = await db.collection("teams").get();
    let created = 0;
    let skippedExisting = 0;
    let skippedInvalid = 0;
    let skippedInactive = 0;
    let failed = 0;

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;
      const team = (teamDoc.data() || {}) as Record<string, unknown>;
      const teamStatus = String(team.status || "active").toLowerCase();
      if (teamStatus !== "active") {
        skippedInactive += 1;
        continue;
      }

      try {
        const existsSnap = await db
          .collection("teams")
          .doc(teamId)
          .collection("fees")
          .where("autoMonthKey", "==", monthKey)
          .limit(1)
          .get();
        if (!existsSnap.empty) {
          skippedExisting += 1;
          continue;
        }

        const amount = getMonthlyFeeAmount(team);
        if (!Number.isFinite(amount) || amount < MIN_FEE_AMOUNT) {
          skippedInvalid += 1;
          logger.warn("[monthlyTeamFeeScheduler] invalid amount", { teamId, amount, monthKey });
          continue;
        }

        const dueDay = getDueDay(team);
        const dueTs = Timestamp.fromDate(new Date(year, month - 1, dueDay, 12, 0, 0));
        const title = `${month}월 회비`;

        await db
          .collection("teams")
          .doc(teamId)
          .collection("fees")
          .add({
            title,
            amount,
            dueDate: dueTs ?? dueDate,
            status: "open",
            reminderSent: false,
            createdBy: SYSTEM_CREATED_BY,
            autoCreated: true,
            autoMonthKey: monthKey,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

        created += 1;
      } catch (e) {
        failed += 1;
        logger.error("[monthlyTeamFeeScheduler] 팀 처리 실패", {
          teamId,
          monthKey,
          error: String(e),
        });
      }
    }

    logger.info("[monthlyTeamFeeScheduler] 완료", {
      monthKey,
      teamsTotal: teamsSnap.size,
      created,
      skippedExisting,
      skippedInvalid,
      skippedInactive,
      failed,
    });
  }
);
