import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NotificationExperimentId, NotificationVariant } from "./pushExperimentCopy";
import { pickAbVariant } from "./pushExperimentCopy";

/**
 * `teams/{teamId}/experiments/{experimentId}` 에서 승자 롤아웃이 확정됐으면 해당 variant만 사용.
 * 문서 없음·권한 없음·미확정이면 50:50 A/B.
 */
export async function resolveNotificationExperimentVariant(
  teamId: string | undefined,
  experimentId: NotificationExperimentId
): Promise<NotificationVariant> {
  const tid = typeof teamId === "string" ? teamId.trim() : "";
  if (!tid) return pickAbVariant();
  try {
    const ref = doc(db, "teams", tid, "experiments", experimentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return pickAbVariant();
    const d = snap.data() as Record<string, unknown>;
    if (d.rollout === "winner_only" && (d.winner === "A" || d.winner === "B")) {
      return d.winner;
    }
  } catch {
    // 권한·오프라인 등 → 랜덤
  }
  return pickAbVariant();
}
