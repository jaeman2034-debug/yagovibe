import { useState, useCallback, useEffect } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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

interface UseMessagesPaginationOptions {
  chatRoomId: string | undefined;
  initialCursor?: QueryDocumentSnapshot<DocumentData> | null;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 30;

/**
 * 과거 메시지 페이지네이션 (실시간 구독 없음)
 */
export function useMessagesPagination({
  chatRoomId,
  initialCursor = null,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseMessagesPaginationOptions) {
  const [olderMessages, setOlderMessages] = useState<MessageDoc[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(initialCursor ?? null);

  useEffect(() => {
    setOlderMessages([]);
    setHasMore(true);
    setCursor(initialCursor ?? null);
  }, [chatRoomId]);

  useEffect(() => {
    setCursor((prev) => (prev === null ? (initialCursor ?? null) : prev));
  }, [initialCursor]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatRoomId || isLoadingOlder || !hasMore) return;

    const startCursor = cursor ?? initialCursor;
    if (!startCursor) {
      return;
    }

    setIsLoadingOlder(true);
    try {
      const msgsRef = collection(db, "chatRooms", chatRoomId, "messages");
      let q = query(
        msgsRef,
        orderBy("createdAt", "desc"),
        limit(pageSize + 1)
      );

      if (startCursor) {
        q = query(q, startAfter(startCursor));
      }

      const snap = await getDocs(q);
      const docs = snap.docs;
      const newRows: MessageDoc[] = docs.slice(0, pageSize).map((d) => ({
        id: d.id,
        ...(d.data() as object),
      })) as MessageDoc[];

      if (newRows.length === 0) {
        setHasMore(false);
      } else {
        const newCursor = docs[newRows.length - 1];
        setCursor(newCursor);
        setHasMore(docs.length > pageSize);
        setOlderMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const toAdd = newRows.filter((m) => !seen.has(m.id));
          return [...toAdd, ...prev].sort(
            (a, b) => getTimestamp(a) - getTimestamp(b)
          );
        });
      }
    } catch (error) {
      console.warn("⚠️ [useMessagesPagination] 과거 메시지 로드 실패:", error);
      setHasMore(false);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [chatRoomId, cursor, initialCursor, olderMessages.length, isLoadingOlder, hasMore, pageSize]);

  const resetCursor = useCallback((newCursor: QueryDocumentSnapshot<DocumentData> | null) => {
    setCursor(newCursor);
    setOlderMessages([]);
    setHasMore(true);
  }, []);

  return {
    olderMessages,
    isLoadingOlder,
    hasMore,
    loadOlderMessages,
    resetCursor,
  };
}
