import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type ReconcileCashBookForTeamResult = {
  ok: boolean;
  ledger: number;
  storedBefore: number;
  delta: number;
  txCount: number;
  balanceCorrected: boolean;
};

export async function callReconcileCashBookForTeam(teamId: string): Promise<ReconcileCashBookForTeamResult> {
  const fn = httpsCallable<{ teamId: string }, ReconcileCashBookForTeamResult>(functions, "reconcileCashBookForTeam");
  const res = await fn({ teamId: teamId.trim() });
  return res.data as ReconcileCashBookForTeamResult;
}
