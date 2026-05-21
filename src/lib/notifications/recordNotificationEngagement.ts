import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cacheFeeExperimentAttributionIfApplicable } from "@/lib/notifications/feeExperimentAttribution";

function normalizeId(id: string | undefined | null): string | null {
  const t = typeof id === "string" ? id.trim() : "";
  return t.length > 0 ? t : null;
}

/**
 * 포그라운드 등에서 알림 페이로드를 앱이 받은 시점 (최초 1회만 기록).
 */
export async function recordNotificationPushOpened(
  notificationId: string | undefined | null
): Promise<void> {
  const id = normalizeId(notificationId);
  if (!id) return;
  const ref = doc(db, "notifications", id);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.openedAt) return;
      tx.update(ref, { openedAt: serverTimestamp() });
    });
  } catch {
    // 지표 전용 — 오프라인/권한 실패는 무시
  }
}

/**
 * 시스템 푸시 클릭 또는 인박스에서 이동 시 (최초 1회만 기록).
 */
export async function recordNotificationClicked(
  notificationId: string | undefined | null
): Promise<void> {
  const id = normalizeId(notificationId);
  if (!id) return;
  const ref = doc(db, "notifications", id);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      if (snap.data().clickedAt) return;
      tx.update(ref, { clickedAt: serverTimestamp() });
    });
  } catch {
    // 지표 전용
  }
  void cacheFeeExperimentAttributionIfApplicable(notificationId);
}
