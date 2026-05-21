import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Channel = "chats" | "chatRooms";

type UsePaginatedMessagesParams = {
  channel: Channel;
  roomId: string;
  tailSize?: number;
  olderPageSize?: number;
  onListenError?: (err: unknown) => void;
};

function toMillisSafe(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") {
      try {
        return fn();
      } catch {
        return 0;
      }
    }
  }
  if (typeof value === "object" && value && "seconds" in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds ?? 0);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }
  return 0;
}

function sortMessagesAsc<T extends { createdAt?: unknown; id?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aMs = toMillisSafe(a.createdAt);
    const bMs = toMillisSafe(b.createdAt);
    if (aMs !== bMs) return aMs - bMs;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
}

export function usePaginatedMessages({
  channel,
  roomId,
  tailSize = 50,
  olderPageSize = 30,
  onListenError,
}: UsePaginatedMessagesParams) {
  const [olderMsgs, setOlderMsgs] = useState<any[]>([]);
  const [tailMsgs, setTailMsgs] = useState<any[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadOlderInFlightRef = useRef(false);
  const pagingRef = useRef({ olderMsgs, tailMsgs });
  pagingRef.current = { olderMsgs, tailMsgs };

  const messages = [...olderMsgs, ...tailMsgs];
  const tailLastId = tailMsgs.length ? tailMsgs[tailMsgs.length - 1]?.id : "";

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setOlderMsgs([]);
    setTailMsgs([]);
    setHasMoreOlder(true);
    const messagesCol = collection(db, channel, roomId, "messages");
    const tailQ = query(messagesCol, orderBy("createdAt", "desc"), limit(tailSize));
    if (import.meta.env.DEV) {
      console.log("[usePaginatedMessages] listen start", {
        path: `${channel}/${roomId}/messages`,
        tailSize,
      });
    }
    const unsub = onSnapshot(
      tailQ,
      async (snap) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          const newest = snap.docs[0];
          const oldest = snap.docs[snap.docs.length - 1];
          console.log("[usePaginatedMessages] snapshot", {
            path: `${channel}/${roomId}/messages`,
            size: snap.size,
            hasPendingWrites: snap.metadata.hasPendingWrites,
            newestId: newest?.id ?? null,
            oldestId: oldest?.id ?? null,
          });
        }
        const asc = sortMessagesAsc(
          [...snap.docs].map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setTailMsgs(asc);

        // 레거시 데이터 중 createdAt 누락 문서가 있으면 orderBy 쿼리에서 제외될 수 있어 fallback 1회 조회
        if (snap.empty) {
          try {
            const fallbackSnap = await getDocs(query(messagesCol, limit(tailSize)));
            if (!cancelled && !fallbackSnap.empty) {
              const fallbackAsc = sortMessagesAsc(
                fallbackSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
              );
              setTailMsgs(fallbackAsc);
            }
          } catch (fallbackErr) {
            if (import.meta.env.DEV) {
              console.warn(
                `[usePaginatedMessages] ${channel}/${roomId} fallback load error:`,
                fallbackErr
              );
            }
          }
        }

        if (snap.docs.length < tailSize) {
          setHasMoreOlder(false);
        }
      },
      (err) => {
        console.warn(`[usePaginatedMessages] ${channel}/${roomId} snapshot error:`, err);
        setTailMsgs([]);
        setOlderMsgs([]);
        setHasMoreOlder(false);
        onListenError?.(err);
      }
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [channel, roomId, tailSize, onListenError]);

  const loadOlderMessages = useCallback(async () => {
    if (!roomId || loadingOlder || !hasMoreOlder || loadOlderInFlightRef.current) return;
    loadOlderInFlightRef.current = true;
    const { olderMsgs: o, tailMsgs: t } = pagingRef.current;
    const oldest = o.length > 0 ? o[0] : t[0];
    if (!oldest?.id) {
      setHasMoreOlder(false);
      loadOlderInFlightRef.current = false;
      return;
    }
    setLoadingOlder(true);
    try {
      const messagesCol = collection(db, channel, roomId, "messages");
      const anchorRef = doc(db, channel, roomId, "messages", oldest.id);
      const anchorSnap = await getDoc(anchorRef);
      if (!anchorSnap.exists()) {
        setHasMoreOlder(false);
        setLoadingOlder(false);
        loadOlderInFlightRef.current = false;
        return;
      }
      const olderQ = query(
        messagesCol,
        orderBy("createdAt", "desc"),
        startAfter(anchorSnap),
        limit(olderPageSize)
      );
      const snap = await getDocs(olderQ);
      if (import.meta.env.DEV) {
        console.log("[usePaginatedMessages] older page", {
          path: `${channel}/${roomId}/messages`,
          anchorId: oldest.id,
          fetched: snap.size,
        });
      }
      if (snap.empty) {
        setHasMoreOlder(false);
        setLoadingOlder(false);
        loadOlderInFlightRef.current = false;
        return;
      }
      const batchAsc = sortMessagesAsc(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
      setOlderMsgs((prev) => [...batchAsc, ...prev]);
      if (snap.docs.length < olderPageSize) {
        setHasMoreOlder(false);
      }
    } catch (e) {
      console.warn(`[usePaginatedMessages] ${channel}/${roomId} older load error:`, e);
    } finally {
      setLoadingOlder(false);
      loadOlderInFlightRef.current = false;
    }
  }, [channel, roomId, loadingOlder, hasMoreOlder, olderPageSize]);

  return {
    messages,
    olderMsgs,
    tailMsgs,
    tailLastId,
    hasMoreOlder,
    loadingOlder,
    loadOlderMessages,
  };
}
