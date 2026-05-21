import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ActivityFeedbackType } from "@/types/activityFeedback";

export function userActivityFeedbackDocId(
  userId: string,
  activityId: string,
  type: ActivityFeedbackType
): string {
  return `${userId}_${activityId}_${type}`;
}

/**
 * 피드백 1건 기록 (동일 user+activity+type 재제출 시 덮어쓰기만 되고 CF increment는 재실행 안 됨)
 */
export async function submitActivityFeedback(params: {
  userId: string;
  activityId: string;
  type: ActivityFeedbackType;
}): Promise<void> {
  const id = userActivityFeedbackDocId(params.userId, params.activityId, params.type);
  await setDoc(doc(db, "user_activity_feedback", id), {
    userId: params.userId,
    activityId: params.activityId,
    type: params.type,
    createdAt: serverTimestamp(),
  });
}

/** 본인 피드백 문서 삭제 — CF가 activities 집계를 감소 */
export async function deleteActivityFeedback(params: {
  userId: string;
  activityId: string;
  type: ActivityFeedbackType;
}): Promise<void> {
  const id = userActivityFeedbackDocId(params.userId, params.activityId, params.type);
  await deleteDoc(doc(db, "user_activity_feedback", id));
}
