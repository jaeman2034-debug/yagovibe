import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type BackfillMyTeamMembershipsResult = {
  ok: boolean;
  matchedTeams: number;
  upserted: number;
  message?: string;
};

function logCallableFailure(label: string, e: unknown): void {
  const err = e as {
    code?: string;
    message?: string;
    details?: unknown;
    customData?: unknown;
  };
  console.warn(`[${label}] backfillMyTeamMemberships callable 실패`, {
    code: err?.code,
    message: err?.message,
    details: err?.details,
    customData: err?.customData,
  });
}

export async function backfillMyTeamMemberships(): Promise<BackfillMyTeamMembershipsResult> {
  const callable = httpsCallable<undefined, BackfillMyTeamMembershipsResult>(
    functions,
    "backfillMyTeamMemberships"
  );
  try {
    const result = await callable();
    return result.data;
  } catch (e) {
    logCallableFailure("backfillMyTeamMemberships", e);
    throw e;
  }
}

