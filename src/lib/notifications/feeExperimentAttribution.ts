import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NOTIFICATION_EXPERIMENT_IDS } from "@/lib/notifications/experiments/pushExperimentCopy";

const STORAGE_KEY = "yago_fee_notif_attribution_v1";
const TTL_MS = 1000 * 60 * 60 * 72; // 72h

const TRACKED = new Set<string>(Object.values(NOTIFICATION_EXPERIMENT_IDS));

export type FeeExperimentAttributionPayload = {
  teamId: string;
  feeId?: string;
  experiment: string;
  variant: "A" | "B";
  notificationId: string;
  savedAt: number;
};

export function setFeeExperimentAttribution(
  payload: Omit<FeeExperimentAttributionPayload, "savedAt">
): void {
  if (typeof window === "undefined") return;
  const full: FeeExperimentAttributionPayload = { ...payload, savedAt: Date.now() };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // 저장 실패 무시
  }
}

export function peekFeeAttributionNotificationId(teamId: string, feeId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as FeeExperimentAttributionPayload;
    if (!a?.teamId || a.teamId !== teamId) return null;
    if (a.feeId && a.feeId !== feeId) return null;
    if (Date.now() - (a.savedAt || 0) > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const nid = typeof a.notificationId === "string" ? a.notificationId.trim() : "";
    return nid.length > 0 ? nid : null;
  } catch {
    return null;
  }
}

export function clearFeeExperimentAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** 카드 재등록 플로우: 팀 일치 + billing_reregister_v1 실험 알림만 */
export function peekBillingReRegisterAttributionNotificationId(teamId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as FeeExperimentAttributionPayload;
    if (!a?.teamId || a.teamId !== teamId) return null;
    if (a.experiment !== NOTIFICATION_EXPERIMENT_IDS.BILLING_REREGISTER_V1) return null;
    if (Date.now() - (a.savedAt || 0) > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const nid = typeof a.notificationId === "string" ? a.notificationId.trim() : "";
    return nid.length > 0 ? nid : null;
  } catch {
    return null;
  }
}

/** 알림 클릭 직후: 회비 실험 알림이면 sessionStorage에 귀속 정보 저장 */
export async function cacheFeeExperimentAttributionIfApplicable(
  notificationId: string | undefined | null
): Promise<void> {
  const id = typeof notificationId === "string" ? notificationId.trim() : "";
  if (!id) return;
  try {
    const snap = await getDoc(doc(db, "notifications", id));
    if (!snap.exists()) return;
    const d = snap.data();
    const t = typeof d.type === "string" ? d.type : "";
    if (t !== "fee_reminder" && t !== "billing_re_register_request") return;
    const experiment = typeof d.experiment === "string" ? d.experiment.trim() : "";
    const variant = d.variant === "A" || d.variant === "B" ? d.variant : null;
    const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
    if (!teamId || !variant || !TRACKED.has(experiment)) return;
    const feeId = typeof d.feeId === "string" && d.feeId.trim() ? d.feeId.trim() : undefined;
    setFeeExperimentAttribution({
      teamId,
      feeId,
      experiment,
      variant,
      notificationId: id,
    });
  } catch {
    // 읽기 실패 무시
  }
}
