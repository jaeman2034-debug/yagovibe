import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MessageDoc {
  id: string;
  senderId: string;
  text?: string;
  type?: string;
  images?: Array<{ url: string; thumbUrl: string; width: number; height: number }>;
  videos?: Array<{ url: string; thumbUrl: string; duration: number; size: number }>;
  location?: { lat: number; lng: number; address?: string };
  createdAt?: unknown;
  pending?: boolean;
  readBy?: string[];
  reactions?: { [emoji: string]: string[] };
  seq?: number;
  [key: string]: unknown;
}

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

interface UseMessagesRealtimeOptions {
  chatRoomId: string | undefined;
  myUid: string;
  pageSize?: number;
  onNewMessage?: (message: MessageDoc) => void;
  onError?: (error: { code?: string }) => void;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * 최신 메시지만 실시간 구독
 * - orderBy(createdAt, desc) limit(50)
 * - UI용 오름차순 정렬
 * - optimistic 업데이트용 setMessages
 */
export function useMessagesRealtime({
  chatRoomId,
  myUid,
  pageSize = DEFAULT_PAGE_SIZE,
  onNewMessage,
  onError,
}: UseMessagesRealtimeOptions) {
  const navigate = useNavigate();
  const [realtimeMessages, setRealtimeMessages] = useState<MessageDoc[]>([]);
  const [isRealtimeLoading, setIsRealtimeLoading] = useState(true);
  const [latestDoc, setLatestDoc] = useState<QueryDocumentSnapshot | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onErrorRef = useRef(onError);
  onNewMessageRef.current = onNewMessage;
  onErrorRef.current = onError;

  const setMessages = useCallback((updater: React.SetStateAction<MessageDoc[]>) => {
    setRealtimeMessages(updater);
  }, []);

  useEffect(() => {
    if (!chatRoomId) {
      setIsRealtimeLoading(false);
      return;
    }

    const msgsRef = collection(db, "chatRooms", chatRoomId, "messages");
    const q = query(
      msgsRef,
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    let isUnmounted = false;
    setIsRealtimeLoading(true);

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (isUnmounted) return;

        const rows: MessageDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as object),
        })) as MessageDoc[];

        const oldestDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        setLatestDoc(oldestDoc);

        setRealtimeMessages((prev) => {
          const map = new Map<string, MessageDoc>();
          prev.forEach((msg) => {
            if (msg.pending || msg.id.startsWith("temp-")) {
              map.set(msg.id, msg);
            }
          });
          rows.forEach((msg) => map.set(msg.id, msg));
          return Array.from(map.values()).sort(
            (a, b) => getTimestamp(a) - getTimestamp(b)
          );
        });

        setIsRealtimeLoading(false);

        if (myUid && rows.length > 0) {
          const unreadMessages = rows
            .filter(
              (msg) =>
                msg.senderId !== myUid &&
                (!(msg as { readBy?: string[] }).readBy ||
                  !(msg as { readBy?: string[] }).readBy!.includes(myUid))
            )
            .slice(-10);

          if (unreadMessages.length > 0) {
            Promise.all(
              unreadMessages.map(async (msg) => {
                try {
                  const msgRef = doc(db, "chatRooms", chatRoomId, "messages", msg.id);
                  const { arrayUnion } = await import("firebase/firestore");
                  await updateDoc(msgRef, { readBy: arrayUnion(myUid) });
                } catch (error) {
                  console.warn("⚠️ [useMessagesRealtime] 읽음 표시 실패:", error);
                }
              })
            ).catch(() => {});
          }
        }

        if (rows.length > 0) {
          const lastMessage = rows[0];
          if (
            lastMessage.id !== lastMessageIdRef.current &&
            lastMessage.senderId !== myUid &&
            lastMessage.text &&
            String(lastMessage.text).trim() &&
            lastMessage.type !== "system"
          ) {
            lastMessageIdRef.current = lastMessage.id;
            onNewMessageRef.current?.(lastMessage);
          } else if (lastMessage.id !== lastMessageIdRef.current) {
            lastMessageIdRef.current = lastMessage.id;
          }
        }
      },
      (error: { code?: string }) => {
        if (error.code === "unavailable" || error.code === "deadline-exceeded") return;
        if (error.code === "permission-denied") {
          console.error("❌ [useMessagesRealtime] 권한 없음");
          navigate("/app/market");
          onErrorRef.current?.(error);
        }
        if (error.code === "failed-precondition" && process.env.NODE_ENV === "development") {
          console.warn("⚠️ [useMessagesRealtime] Firestore 인덱스 필요");
        }
        setIsRealtimeLoading(false);
      }
    );

    return () => {
      isUnmounted = true;
      unsub();
    };
  }, [chatRoomId, myUid, navigate, pageSize]);

  return {
    realtimeMessages,
    setMessages,
    isRealtimeLoading,
    latestDoc,
  };
}
