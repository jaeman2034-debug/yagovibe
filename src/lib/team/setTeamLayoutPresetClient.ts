import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TeamPublicLayoutPreset } from "@/lib/team/resolveTeamPublicProfile";

export async function setTeamLayoutPresetCallable(payload: {
  teamId: string;
  layoutPreset: TeamPublicLayoutPreset;
}): Promise<{ ok?: boolean; layoutPreset?: string }> {
  const fn = httpsCallable<
    { teamId: string; layoutPreset: TeamPublicLayoutPreset },
    { ok?: boolean; layoutPreset?: string }
  >(functions, "setTeamLayoutPreset");
  const res = await fn(payload);
  return res.data ?? {};
}
