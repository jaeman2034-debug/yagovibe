/**
 * 거래 1:1(chats) 읽음 표시 — 메시지 readBy + 방 문서 readBy[상대] 커서 병합
 */

export function readByUidsFromMessage(m: {
  readBy?: string[] | Record<string, unknown> | null;
}): string[] {
  const rb = m.readBy;
  if (Array.isArray(rb)) return rb as string[];
  if (rb && typeof rb === "object" && !Array.isArray(rb)) {
    return Object.keys(rb as Record<string, unknown>);
  }
  return [];
}

/** ChatRoom 등 기존 호출명 호환 */
export const readByUids = readByUidsFromMessage;

function firestoreTimeMs(value: unknown): number {
  try {
    if (value == null) return 0;
    const v = value as { toDate?: () => Date };
    if (typeof v.toDate === "function") {
      const d = v.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    return 0;
  } catch {
    return 0;
  }
}

/** 내가 보낸 메시지에 대해 상대가 읽었는지 (메시지 단위 readBy ∪ 채팅방 readBy[상대] 시각) */
export function peerHasReadMyMessage(
  m: { createdAt?: unknown; readBy?: unknown },
  otherUserId: string,
  peerReadCursor: unknown
): boolean {
  if (!otherUserId) return false;
  if (readByUidsFromMessage(m).includes(otherUserId)) return true;
  if (!peerReadCursor) return false;
  const msgMs = firestoreTimeMs(m.createdAt);
  if (!msgMs) return false;
  const peerMs = firestoreTimeMs(peerReadCursor);
  return peerMs >= msgMs;
}
