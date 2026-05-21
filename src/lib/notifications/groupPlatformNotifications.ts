import type { Notification, NotificationType } from "@/types/notification";

const CHAT_THREAD_TYPES = new Set<NotificationType>([
  "CHAT_MESSAGE",
  "CHAT_LOCATION_SHARED",
  "CHAT_VOICE_SUMMARY",
  "MARKET_CHAT_MESSAGE",
]);

const TRADE_CLUSTER_TYPES = new Set<NotificationType>([
  "PRICE_OFFER",
  "TRADE_RESERVED",
  "TRADE_COMPLETED",
  "TRADE_CANCELLED",
  "MARKET_TRANSACTION_COMPLETE",
]);

export type PlatformNotificationGroupKind = "thread" | "trade" | "singleton";

export interface PlatformNotificationGroup {
  key: string;
  kind: PlatformNotificationGroupKind;
  /** 스레드(채팅) 그룹일 때 — 일괄 읽음 등에 사용 */
  chatThreadId?: string;
  items: Notification[];
}

function createdAtMs(n: Notification): number {
  if (typeof n.createdAtMillis === "number" && Number.isFinite(n.createdAtMillis)) {
    return n.createdAtMillis;
  }
  const ca = n.createdAt as { toMillis?: () => number; seconds?: number } | undefined;
  if (ca && typeof ca.toMillis === "function") return ca.toMillis();
  if (ca && typeof ca.seconds === "number") return ca.seconds * 1000;
  return 0;
}

function resolveChatThreadId(n: Notification): string | undefined {
  if (n.relatedChatId) return String(n.relatedChatId).trim() || undefined;
  const p = n.payload as { chatRoomId?: string } | undefined;
  if (p?.chatRoomId) return String(p.chatRoomId).trim() || undefined;
  if (n.target?.screen === "chat" && n.target.id) return String(n.target.id).trim() || undefined;
  return undefined;
}

function resolveTradeClusterId(n: Notification): string | undefined {
  const p = n.payload as { tradeId?: string } | undefined;
  if (p?.tradeId) return String(p.tradeId).trim() || undefined;
  if (n.target?.screen === "trade" && n.target.id) return String(n.target.id).trim() || undefined;
  return undefined;
}

function groupKeyFor(n: Notification): string {
  if (CHAT_THREAD_TYPES.has(n.type)) {
    const cid = resolveChatThreadId(n);
    if (cid) return `chat:${cid}`;
  }
  if (TRADE_CLUSTER_TYPES.has(n.type)) {
    const tid = resolveTradeClusterId(n);
    if (tid) return `trade:${tid}`;
  }
  return `singleton:${n.id}`;
}

/**
 * 알림 목록을 스레드(채팅)·거래 단위로 묶어 최신순 정렬.
 * — 같은 chatId / tradeId로 여러 문서가 있어도 한 줄로 표시 (미읽음 합산·탭 동작용)
 */
export function groupPlatformNotifications(notifications: Notification[]): PlatformNotificationGroup[] {
  const map = new Map<string, Notification[]>();
  for (const n of notifications) {
    const k = groupKeyFor(n);
    const list = map.get(k);
    if (list) list.push(n);
    else map.set(k, [n]);
  }

  const out: PlatformNotificationGroup[] = [];
  for (const [key, items] of map) {
    items.sort((a, b) => createdAtMs(b) - createdAtMs(a));
    const kind: PlatformNotificationGroupKind = key.startsWith("chat:")
      ? "thread"
      : key.startsWith("trade:")
        ? "trade"
        : "singleton";
    out.push({
      key,
      kind,
      chatThreadId: kind === "thread" ? key.slice("chat:".length) : undefined,
      items,
    });
  }

  out.sort((a, b) => createdAtMs(b.items[0]) - createdAtMs(a.items[0]));
  return out;
}

export function countUnreadInGroup(group: PlatformNotificationGroup): number {
  return group.items.filter((n) => !n.isRead).length;
}
