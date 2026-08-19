import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ClubIntroProfile } from "@/types/clubIntroProfile";

export async function setTeamClubIntroCallable(payload: {
  teamId: string;
  clubIntro: ClubIntroProfile | null;
}): Promise<{ ok: boolean }> {
  const fn = httpsCallable<typeof payload, { ok?: boolean }>(functions, "setTeamClubIntro");
  const result = await fn(payload);
  return { ok: Boolean(result.data?.ok) };
}
