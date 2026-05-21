import type { Notification } from "@/types/notification";

/**
 * 알림 문서에서 채팅 딥링크용 메시지 ID 추출 (Firestore 필드 편차 흡수)
 */
export function getNotificationMessageId(n: Notification): string | null {
  const payload = n.payload as Record<string, unknown> | undefined;
  const targetParams = n.target?.params as Record<string, unknown> | undefined;
  const legacyTop = (n as Record<string, unknown>).messageId;

  const raw = payload?.messageId ?? targetParams?.messageId ?? n.relatedMessageId ?? legacyTop;

  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
