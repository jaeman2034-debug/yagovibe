import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type RevertTeamPublicFieldPayload = {
  teamId: string;
  field: "description" | "highlights" | "recruitMessage" | "captainMessage";
};

export type RevertTeamPublicFieldResult = {
  ok?: boolean;
  skipped?: boolean;
  field?: string;
};

export async function revertTeamPublicFieldCallable(
  payload: RevertTeamPublicFieldPayload
): Promise<RevertTeamPublicFieldResult> {
  const fn = httpsCallable<RevertTeamPublicFieldPayload, RevertTeamPublicFieldResult>(
    functions,
    "revertTeamPublicField"
  );
  const result = await fn(payload);
  return result.data ?? {};
}
