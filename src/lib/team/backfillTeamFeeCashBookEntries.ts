import { httpsCallable } from "firebase/functions";
import { CLOUD_CALLABLE_DEFAULT } from "@/config/cloudCallableNames";
import { functions } from "@/lib/firebase";
import { ensureCallableAuth } from "@/lib/firebase/ensureCallableAuth";

export type BackfillTeamFeeCashBookEntriesInput = {
  teamId: string;
  feeId?: string;
};

export type BackfillTeamFeeCashBookEntriesResult = {
  scanned: number;
  created: number;
  skipped: number;
  patched?: number;
  /** feeId로 조회한 전체 payments 문서 수(그중 status===paid 는 scanned) */
  fetched?: number;
  /** 문서 1건 처리 중 예외(나머지 건은 계속 처리) */
  rowErrors?: number;
};

export async function backfillTeamFeeCashBookEntries(
  input: BackfillTeamFeeCashBookEntriesInput
): Promise<BackfillTeamFeeCashBookEntriesResult> {
  await ensureCallableAuth();
  const callable = httpsCallable<
    BackfillTeamFeeCashBookEntriesInput,
    BackfillTeamFeeCashBookEntriesResult
  >(functions, CLOUD_CALLABLE_DEFAULT.backfillTeamFeeCashBookEntries);

  const payload: BackfillTeamFeeCashBookEntriesInput = {
    teamId: String(input.teamId || "").trim(),
  };
  if (input.feeId && String(input.feeId).trim()) {
    payload.feeId = String(input.feeId).trim();
  }

  const res = await callable(payload);
  return res.data;
}

