import { useMemo } from "react";
import type { MessageDoc } from "./useMessagesRealtime";

function getTimestamp(m: MessageDoc): number {
  const c = m.createdAt as
    | { toMillis?: () => number; getTime?: () => number }
    | Date
    | undefined;
  if (!c) return 0;
  if (typeof (c as { toMillis?: () => number }).toMillis === "function") {
    return (c as { toMillis: () => number }).toMillis();
  }
  if (typeof (c as { getTime?: () => number }).getTime === "function") {
    return (c as { getTime: () => number }).getTime();
  }
  if (c instanceof Date) return c.getTime();
  return 0;
}

interface UseMessageGroupingOptions {
  realtimeMessages: MessageDoc[];
  olderMessages: MessageDoc[];
  myUid: string;
}

/**
 * 실시간 + 과거 메시지 병합, 정렬, 중복 제거
 */
export function useMessageGrouping({
  realtimeMessages,
  olderMessages,
  myUid,
}: UseMessageGroupingOptions) {
  return useMemo(() => {
    const seen = new Set<string>();
    const merged: MessageDoc[] = [];

    const add = (msg: MessageDoc) => {
      if (seen.has(msg.id)) return;
      seen.add(msg.id);
      merged.push(msg);
    };

    olderMessages.forEach(add);
    realtimeMessages.forEach(add);

    const messages = merged.sort((a, b) => getTimestamp(a) - getTimestamp(b));

    return { messages };
  }, [realtimeMessages, olderMessages, myUid]);
}
