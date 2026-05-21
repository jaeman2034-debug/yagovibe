/**
 * 신규 팀 회계 온보딩 — 기본 회비 정책 + 이번 달(서울) 첫 회차 생성.
 * `payments` 시드는 `onFeeCreatedSeedTeamPayments` 트리거가 동일 규칙으로 처리한다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { DEFAULT_TEAM_FEE_POLICY } from "./teamFeePolicy";
import { seoulCalendarFromInstant, seoulDayToDueDateBounds } from "../scheduler/seoulDateUtils";

const REGION = "asia-northeast3";
const MIN_MONTHLY_FEE_WON = 1000;
const DEFAULT_MONTHLY_FEE_WON = 20000;

function seoulYearMonthKey(ms: number): string {
  const { y, M } = seoulCalendarFromInstant(ms);
  return `${y}-${String(M).padStart(2, "0")}`;
}

export type InitializeTeamAccountingResponse = {
  success: boolean;
  feeId?: string;
  autoMonthKey?: string;
  monthlyAmount?: number;
  skipped?: "fee_already_exists";
};

export const initializeTeamAccounting = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<InitializeTeamAccountingResponse> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const raw = request.data as Record<string, unknown> | undefined;
    const teamId = typeof raw?.teamId === "string" ? raw.teamId.trim() : "";
    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }

    let monthlyAmount = DEFAULT_MONTHLY_FEE_WON;
    if (raw?.monthlyFee != null && raw.monthlyFee !== "") {
      const n = Math.floor(Number(raw.monthlyFee));
      if (!Number.isFinite(n) || n < MIN_MONTHLY_FEE_WON) {
        throw new HttpsError(
          "invalid-argument",
          `월 회비는 ${MIN_MONTHLY_FEE_WON.toLocaleString("ko-KR")}원 이상이어야 합니다.`
        );
      }
      monthlyAmount = n;
    }

    const db = getFirestore();
    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const team = teamSnap.data() as Record<string, unknown>;
    const ownerUid =
      (typeof team.ownerUid === "string" && team.ownerUid.trim()) ||
      (typeof team.ownerUserId === "string" && team.ownerUserId.trim()) ||
      "";
    if (!ownerUid || ownerUid !== uid) {
      throw new HttpsError("permission-denied", "팀 소유자만 회비 초기화를 실행할 수 있습니다.");
    }

    const nowMs = Date.now();
    const autoMonthKey = seoulYearMonthKey(nowMs);
    const { y, M } = seoulCalendarFromInstant(nowMs);
    const dueDay = 25;
    const { end: dueEndTs } = seoulDayToDueDateBounds(y, M, dueDay);

    const policyRef = teamRef.collection("feePolicies").doc("default");
    const policySnap = await policyRef.get();

    if (!policySnap.exists) {
      await policyRef.set({
        monthlyAmount,
        annual: DEFAULT_TEAM_FEE_POLICY.annual,
        allowExempt: DEFAULT_TEAM_FEE_POLICY.allowExempt,
        updatedAt: FieldValue.serverTimestamp(),
        onboardedAt: FieldValue.serverTimestamp(),
        onboardedBy: uid,
      });
    } else {
      await policyRef.set(
        {
          monthlyAmount,
          updatedAt: FieldValue.serverTimestamp(),
          onboardedAt: FieldValue.serverTimestamp(),
          onboardedBy: uid,
        },
        { merge: true }
      );
    }

    const feesSnap = await teamRef.collection("fees").limit(120).get();
    for (const doc of feesSnap.docs) {
      const fd = doc.data() as Record<string, unknown>;
      const key = typeof fd.autoMonthKey === "string" ? fd.autoMonthKey.trim() : "";
      const st = String(fd.status ?? "open").trim().toLowerCase();
      if (key === autoMonthKey && st !== "closed") {
        logger.info("initializeTeamAccounting: skip existing month fee", {
          teamId,
          feeId: doc.id,
          autoMonthKey,
        });
        return {
          success: true,
          skipped: "fee_already_exists",
          feeId: doc.id,
          autoMonthKey,
          monthlyAmount,
        };
      }
    }

    const feeRef = teamRef.collection("fees").doc();
    const title = `${M}월 회비`;
    await feeRef.set({
      title,
      amount: monthlyAmount,
      dueDate: dueEndTs,
      status: "open",
      reminderSent: false,
      createdBy: uid,
      autoMonthKey,
      createdAt: FieldValue.serverTimestamp(),
    });

    await teamRef.set(
      {
        feeAccountingBootstrappedAt: FieldValue.serverTimestamp(),
        feeAccountingBootstrappedMonth: autoMonthKey,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("initializeTeamAccounting: ok", { teamId, feeId: feeRef.id, autoMonthKey, monthlyAmount });

    return {
      success: true,
      feeId: feeRef.id,
      autoMonthKey,
      monthlyAmount,
    };
  }
);
