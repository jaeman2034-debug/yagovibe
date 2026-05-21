import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type SetTeamCoverPhotoMetaPayload = {
  teamId: string;
  coverPhotoUrl?: string;
  clear?: boolean;
};

export async function setTeamCoverPhotoMetaCallable(
  payload: SetTeamCoverPhotoMetaPayload
): Promise<{ ok?: boolean }> {
  const fn = httpsCallable<SetTeamCoverPhotoMetaPayload, { ok?: boolean }>(functions, "setTeamCoverPhotoMeta");
  const result = await fn(payload);
  return result.data ?? {};
}
