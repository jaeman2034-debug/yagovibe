import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type UpdateTeamPublicCopyPayload = {
  teamId: string;
  description: string;
  homeHighlights: string[];
  recruitMessage: string;
};

export async function updateTeamPublicCopyCallable(payload: UpdateTeamPublicCopyPayload): Promise<{ ok?: boolean }> {
  const fn = httpsCallable<UpdateTeamPublicCopyPayload, { ok?: boolean }>(functions, "updateTeamPublicCopy");
  const result = await fn(payload);
  return result.data ?? {};
}
