import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export async function setTeamEventMessageCallable(payload: {
  teamId: string;
  eventMessage: string;
}): Promise<{ ok?: boolean }> {
  const fn = httpsCallable<typeof payload, { ok?: boolean }>(functions, "setTeamEventMessage");
  const result = await fn(payload);
  return result.data ?? {};
}
