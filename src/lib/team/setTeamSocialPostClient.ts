import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export async function setTeamSocialPostCallable(payload: {
  teamId: string;
  socialPost: string;
}): Promise<{ ok?: boolean }> {
  const fn = httpsCallable<typeof payload, { ok?: boolean }>(functions, "setTeamSocialPost");
  const result = await fn(payload);
  return result.data ?? {};
}
