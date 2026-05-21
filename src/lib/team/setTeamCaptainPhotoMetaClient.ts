import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type SetTeamCaptainPhotoMetaPayload = {
  teamId: string;
  captainPhotoUrl?: string;
  clear?: boolean;
};

export async function setTeamCaptainPhotoMetaCallable(
  payload: SetTeamCaptainPhotoMetaPayload
): Promise<{ ok?: boolean }> {
  const fn = httpsCallable<SetTeamCaptainPhotoMetaPayload, { ok?: boolean }>(functions, "setTeamCaptainPhotoMeta");
  const result = await fn(payload);
  return result.data ?? {};
}
