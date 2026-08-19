/**
 * 채팅 미읽음 — ChatListPage·하단 탭 배지가 동일한 규칙을 쓰도록 단일화
 * - seq(lastMessageSeq - read.lastReadSeq) 우선, 없으면 unreadCount[uid]
 */

export type ChatUnreadFields = {
  unreadCount?: Record<string, number>;
  lastMessageSeq?: number;
  read?: Record<string, { lastReadSeq?: number }>;
};

export function getUnreadForChatDocument(
  data: ChatUnreadFields | null | undefined,
  uid: string | undefined
): number {
  if (!data || !uid) return 0;

  const lastSeq = typeof data.lastMessageSeq === "number" ? data.lastMessageSeq : 0;
  const myReadSeq = data.read?.[uid]?.lastReadSeq ?? 0;
  if (lastSeq > 0) {
    return Math.max(0, lastSeq - myReadSeq);
  }

  const n = data.unreadCount?.[uid];
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
}

export type UnreadListItem = {
  id: string;
  listSource: "room" | "direct";
  type?: string;
  postId?: string;
  productId?: string;
  sellerId?: string;
  buyerId?: string;
  lastMessageAt?: { toDate?: () => Date };
  productSnapshot?: { productId?: string };
} & ChatUnreadFields;

/** ChatListPage `tradeThreadKey` + dedupe와 동일 */
export function tradeThreadDedupeKey(r: UnreadListItem): string | null {
  if ((r.type || "") === "recruit_group") return null;
  const pid =
    r.postId ||
    r.productId ||
    r.productSnapshot?.productId ||
    "";
  if (!pid || !r.sellerId || !r.buyerId) return null;
  return `${pid}__${[r.sellerId, r.buyerId].sort().join("_")}`;
}

function lastMsgTime(r: UnreadListItem): number {
  return r.lastMessageAt?.toDate?.()?.getTime() ?? 0;
}

/** 리스트에 보이는 방과 동일하게 dedupe 후 미읽음 합 */
export function sumUnreadAfterDedupe(items: UnreadListItem[], uid: string | undefined): number {
  if (!uid || items.length === 0) return 0;

  const deduped = new Map<string, UnreadListItem>();
  for (const r of items) {
    const k = tradeThreadDedupeKey(r) ?? `__id:${r.id}`;
    const prev = deduped.get(k);
    if (!prev) {
      deduped.set(k, r);
      continue;
    }
    const tPrev = lastMsgTime(prev);
    const tNext = lastMsgTime(r);
    if (tNext > tPrev) deduped.set(k, r);
    else if (tNext === tPrev && r.listSource === "direct" && prev.listSource !== "direct") {
      deduped.set(k, r);
    }
  }

  let sum = 0;
  deduped.forEach((r) => {
    sum += getUnreadForChatDocument(r, uid);
  });
  return sum;
}
