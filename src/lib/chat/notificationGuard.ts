/**
 * 🔥 알림 스팸 방지 가드 (localStorage 기반)
 * 
 * 배포 안정화:
 * - 같은 메시지 중복 알림 방지
 * - localStorage 기반 추적
 */

const STORAGE_KEY = "lastNotifiedMessageIds";
const MAX_STORED_IDS = 100; // 최대 저장 개수 (메모리 관리)

export function shouldNotify(messageId: string): boolean {
  if (typeof window === "undefined") return true;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = stored ? JSON.parse(stored) : [];

    // 🔥 이미 알림을 보낸 메시지면 스킵
    if (ids.includes(messageId)) {
      return false;
    }

    // 🔥 새 메시지 ID 추가
    ids.push(messageId);

    // 🔥 최대 개수 초과 시 오래된 것 제거
    if (ids.length > MAX_STORED_IDS) {
      ids.shift();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    return true;
  } catch (error) {
    console.warn("⚠️ [notificationGuard] localStorage 오류:", error);
    return true; // 오류 시 알림 허용 (안전 우선)
  }
}

export function clearNotificationHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("⚠️ [notificationGuard] localStorage 삭제 오류:", error);
  }
}
