import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type EnsureTeamMediaUploadAccessResult = {
  ok: boolean;
  ensured: boolean;
  teamId: string;
};

export async function ensureTeamMediaUploadAccess(
  teamId: string
): Promise<EnsureTeamMediaUploadAccessResult> {
  const callable = httpsCallable<
    { teamId: string },
    EnsureTeamMediaUploadAccessResult
  >(functions, "ensureTeamMediaUploadAccess");
  const result = await callable({ teamId: teamId.trim() });
  return result.data;
}
