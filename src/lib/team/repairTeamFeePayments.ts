import { httpsCallable } from "firebase/functions";
import { CLOUD_CALLABLE_DEFAULT } from "@/config/cloudCallableNames";
import { functions } from "@/lib/firebase";
import { ensureCallableAuth } from "@/lib/firebase/ensureCallableAuth";

function callableFirebaseCode(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code?: string }).code ?? "");
  }
  return "";
}

export type RepairTeamFeePaymentsInput = {
  teamId: string;
  feeId?: string;
  dryRun?: boolean;
};

export type RepairTeamFeePaymentsResult = {
  success: boolean;
  scanned: number;
  repairedAmount: number;
  repairedIdentity: number;
  skipped: number;
};

export async function repairTeamFeePayments(
  input: RepairTeamFeePaymentsInput
): Promise<RepairTeamFeePaymentsResult> {
  await ensureCallableAuth();
  const payload = {
    teamId: String(input.teamId || "").trim(),
    feeId: input.feeId ? String(input.feeId).trim() : undefined,
    dryRun: input.dryRun !== false,
  };

  const tryNames = [
    CLOUD_CALLABLE_DEFAULT.repairTeamFeePayments,
    CLOUD_CALLABLE_DEFAULT.repairTeamFeePaymentAmounts,
  ] as const;

  let lastErr: unknown;
  for (const name of tryNames) {
    try {
      const callable =
        httpsCallable<RepairTeamFeePaymentsInput, RepairTeamFeePaymentsResult>(
          functions,
          name
        );
      const res = await callable(payload);
      return res.data;
    } catch (e) {
      lastErr = e;
      const code = callableFirebaseCode(e);
      if (
        code === "functions/not-found" ||
        code === "functions/internal" ||
        code === "functions/unavailable"
      ) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
