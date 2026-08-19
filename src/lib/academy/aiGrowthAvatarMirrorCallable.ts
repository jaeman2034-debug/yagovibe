import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type MirrorAcademyGrowthToAvatarPayload = {
  teamId: string;
  targetUid: string;
  playerId: string;
};

export type MirrorAcademyGrowthToAvatarResult = {
  ok: true;
  targetUid: string;
  growthOvr: number;
};

export async function mirrorAcademyGrowthToAvatarCallable(
  payload: MirrorAcademyGrowthToAvatarPayload
): Promise<MirrorAcademyGrowthToAvatarResult> {
  const fn = httpsCallable<MirrorAcademyGrowthToAvatarPayload, MirrorAcademyGrowthToAvatarResult>(
    functions,
    "mirrorAcademyGrowthToAvatar"
  );
  const res = await fn(payload);
  return res.data;
}
