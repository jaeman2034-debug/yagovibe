import { doc, serverTimestamp, setDoc, type FieldValue } from "firebase/firestore";
import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import type { AvatarGrowthMirrorFields } from "@/lib/ai-growth/avatarGrowthMirrorTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { resolveTeamMemberUidByDisplayName } from "@/lib/ai-growth/resolveGrowthMemberUid";
import { mirrorAcademyGrowthToAvatarCallable } from "@/lib/academy/aiGrowthAvatarMirrorCallable";
import { auth, db } from "@/lib/firebase";

export type MirrorGrowthToAvatarResult = {
  mirrored: boolean;
  targetUid: string | null;
  path: "self" | "callable" | "skipped";
  message: string;
};

export function buildAvatarGrowthPatch(
  teamId: string,
  growthAvatar: PlayerGrowthAvatarDoc
): AvatarGrowthMirrorFields {
  return {
    growthOvr: growthAvatar.ovr,
    growthTier: growthAvatar.tier,
    growthBadges: growthAvatar.badges,
    growthVision: growthAvatar.vision,
    growthPressure: growthAvatar.pressure,
    growthRecovery: growthAvatar.recovery,
    growthUpdatedAt: Date.now(),
    growthSyncedFromTeamId: teamId,
    growthPlayerId: growthAvatar.playerId,
  };
}

export function formatGrowthBadgeLabels(badgeIds: PlayerGrowthAvatarDoc["badges"]): string[] {
  return badgeIds.map((id) => badgeMetaById(id).labelKo);
}

/** 선수 displayName으로 uid를 찾고 avatars/{uid}에 growth* 미러 */
export async function mirrorPlayerGrowthToAvatar(input: {
  teamId: string;
  playerName: string;
  growthAvatar: PlayerGrowthAvatarDoc;
  targetUid?: string | null;
}): Promise<MirrorGrowthToAvatarResult> {
  const targetUid =
    input.targetUid?.trim() ||
    (await resolveTeamMemberUidByDisplayName(input.teamId, input.playerName));

  if (!targetUid) {
    return {
      mirrored: false,
      targetUid: null,
      path: "skipped",
      message: "팀 멤버(로그인 계정)와 이름이 일치하지 않아 Avatar 미러를 건너뛰었습니다.",
    };
  }

  const patch = buildAvatarGrowthPatch(input.teamId, input.growthAvatar);
  const authUid = auth.currentUser?.uid;

  if (authUid === targetUid) {
    const rest = { ...patch };
    delete rest.growthUpdatedAt;
    await setDoc(
      doc(db, "avatars", targetUid),
      {
        ...rest,
        growthUpdatedAt: serverTimestamp() as FieldValue,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return {
      mirrored: true,
      targetUid,
      path: "self",
      message: `Play Avatar에 성장 데이터를 반영했습니다 (OVR ${patch.growthOvr}).`,
    };
  }

  await mirrorAcademyGrowthToAvatarCallable({
    teamId: input.teamId,
    targetUid,
    playerId: input.growthAvatar.playerId,
  });

  return {
    mirrored: true,
    targetUid,
    path: "callable",
    message: `선수 계정(avatars/${targetUid})에 성장 데이터를 반영했습니다 (OVR ${patch.growthOvr}).`,
  };
}
