import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export async function setTeamCaptainMessageCallable(payload: {
  teamId: string;
  captainMessage: string;
}): Promise<{ ok?: boolean }> {
  const fn = httpsCallable<typeof payload, { ok?: boolean }>(functions, "setTeamCaptainMessage");
  const result = await fn(payload);
  return result.data ?? {};
}
