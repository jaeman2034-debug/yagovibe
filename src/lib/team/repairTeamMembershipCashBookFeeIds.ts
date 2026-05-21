import { httpsCallable } from "firebase/functions";
import { CLOUD_CALLABLE_DEFAULT } from "@/config/cloudCallableNames";
import { functions } from "@/lib/firebase";
import { ensureCallableAuth } from "@/lib/firebase/ensureCallableAuth";

export type RepairTeamMembershipCashBookFeeIdsInput = {
  teamId: string;
};

export type RepairTeamMembershipCashBookFeeIdsResult = {
  scanned: number;
  patched: number;
};

/** cashBook 문서에 sourceRefId는 있으나 feeId가 비어 있거나 다른 경우 일괄 보정 */
export async function repairTeamMembershipCashBookFeeIds(
  input: RepairTeamMembershipCashBookFeeIdsInput
): Promise<RepairTeamMembershipCashBookFeeIdsResult> {
  await ensureCallableAuth();
  const callable = httpsCallable<
    RepairTeamMembershipCashBookFeeIdsInput,
    RepairTeamMembershipCashBookFeeIdsResult
  >(functions, CLOUD_CALLABLE_DEFAULT.repairTeamMembershipCashBookFeeIds);

  const res = await callable({
    teamId: String(input.teamId || "").trim(),
  });
  return res.data;
}
