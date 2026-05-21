/**
 * 채팅 메시지 훅
 * - useMessages: 기존 호환용 (useMessagesRealtime 기반)
 * - useMessagesRealtime: 최신 50개 실시간
 * - useMessagesPagination: 과거 30개씩
 * - useMessageGrouping: 병합/정렬
 */

export type { MessageDoc } from "./useMessagesRealtime";
export { useMessagesRealtime } from "./useMessagesRealtime";
export { useMessagesPagination } from "./useMessagesPagination";
export { useMessageGrouping } from "./useMessageGrouping";

import { useMessagesRealtime } from "./useMessagesRealtime";
import { useMessagesPagination } from "./useMessagesPagination";
import { useMessageGrouping } from "./useMessageGrouping";

/**
 * 통합 메시지 훅 (Realtime + Pagination + Grouping)
 * - 최신 50개 실시간 구독
 * - 과거 30개씩 페이지네이션
 */
export function useMessages(options: {
  chatRoomId: string | undefined;
  myUid: string;
  onNewMessage?: (m: import("./useMessagesRealtime").MessageDoc) => void;
  onError?: (e: { code?: string }) => void;
}) {
  const { realtimeMessages, setMessages, isRealtimeLoading, latestDoc } = useMessagesRealtime({
    ...options,
    pageSize: 50,
  });

  const { olderMessages, isLoadingOlder, hasMore, loadOlderMessages } = useMessagesPagination({
    chatRoomId: options.chatRoomId,
    initialCursor: latestDoc,
    pageSize: 30,
  });

  const { messages } = useMessageGrouping({
    realtimeMessages,
    olderMessages,
    myUid: options.myUid,
  });

  return {
    messages,
    setMessages,
    isRealtimeLoading,
    isLoadingOlder,
    hasMore,
    loadOlderMessages,
  };
}
