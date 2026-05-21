/**
 * 단일 팀 cashBookSummary 즉시 정합 — 팀 스태프만 ( Callable )
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { assertHubTeamStaffForManualFee } from "../teamFeePayments";
import { reconcileCashBookSummaryForTeam } from "./cashBookReconcileCore";

export const reconcileCashBookForTeam = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 120,
    memory: "512MiB",
    maxInstances: 10,
  },
  async (request): Promise<{
    ok: boolean;
    ledger: number;
    storedBefore: number;
    delta: number;
    txCount: number;
    balanceCorrected: boolean;
  }> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }
    const teamId = String(request.data?.teamId ?? "").trim();
    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }
    await assertHubTeamStaffForManualFee(teamId, request.auth.uid);
    try {
      const r = await reconcileCashBookSummaryForTeam(teamId, "manual");
      logger.info("[reconcileCashBookForTeam] ok", {
        teamId,
        ledger: r.ledger,
        delta: r.delta,
        txCount: r.txCount,
      });
      return {
        ok: true,
        ledger: r.ledger,
        storedBefore: r.stored,
        delta: r.delta,
        txCount: r.txCount,
        balanceCorrected: r.delta !== 0,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("[reconcileCashBookForTeam] failed", { teamId, error: msg });
      throw new HttpsError("internal", msg || "RECONCILE_FAILED");
    }
  }
);
