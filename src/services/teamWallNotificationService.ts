import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cleanFirestoreData } from "@/utils/firestoreHelpers";
import type { NotificationType } from "@/types/notification";

const BATCH_MAX = 450;

function isActiveMemberDoc(data: Record<string, unknown> | undefined): boolean {
  const s = data?.status;
  return s === undefined || s === null || s === "active";
}

/**
 * 팀 타임라인 글 등록 시, 작성자를 제외한 활성 팀원에게 알림 (배치 커밋)
 */
export async function notifyTeamMembersOfWallPost(params: {
  teamId: string;
  activityId: string;
  authorId: string;
  titlePreview: string;
  authorName?: string;
  /** 공개 피드·딥링크용 (저장 activity와 동일 권장) */
  sport?: string;
}): Promise<void> {
  const { teamId, activityId, authorId, titlePreview, authorName, sport } = params;
  const tid = teamId.trim();
  if (!tid) return;

  let teamName: string | undefined;
  try {
    const teamSnap = await getDoc(doc(db, "teams", tid));
    if (teamSnap.exists()) {
      const d = teamSnap.data() as { name?: string };
      teamName = d.name?.trim() || undefined;
    }
  } catch {
    // 팀명 없이 진행
  }

  const membersSnap = await getDocs(collection(db, "teams", tid, "members"));
  const recipients = membersSnap.docs
    .map((d) => ({ uid: d.id, data: d.data() as Record<string, unknown> }))
    .filter(({ uid, data }) => uid !== authorId && isActiveMemberDoc(data));

  if (recipients.length === 0) return;

  const shortTitle =
    titlePreview.length > 80 ? `${titlePreview.slice(0, 80)}…` : titlePreview;
  const actorLabel = authorName?.trim() || "팀원";
  const type: NotificationType = "TEAM_WALL_POST";

  for (let i = 0; i < recipients.length; i += BATCH_MAX) {
    const chunk = recipients.slice(i, i + BATCH_MAX);
    const batch = writeBatch(db);
    for (const { uid } of chunk) {
      const ref = doc(collection(db, "notifications"));
      const raw = {
        userId: uid,
        type,
        title: "팀 타임라인 새 글",
        message: `${actorLabel}님이 공지를 남겼습니다: ${shortTitle}`,
        actorId: authorId,
        actorName: authorName?.trim() || undefined,
        teamId: tid,
        teamName,
        priority: "normal" as const,
        isRead: false,
        createdAt: serverTimestamp(),
        target: { screen: "team" as const, id: tid, params: { tab: "activity" } },
        payload: {
          activityId,
          teamId: tid,
          refId: activityId,
          refType: "activity" as const,
          sport: sport?.trim() || undefined,
        },
      };
      batch.set(ref, cleanFirestoreData(raw));
    }
    await batch.commit();
  }
}
