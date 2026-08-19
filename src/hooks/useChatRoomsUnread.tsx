/**
 * 채팅 미읽음 합산 — `chatRooms` + 거래 1:1 `chats` (Provider로 앱 전역 1회 구독)
 * - 하단 탭 뱃지 등 `totalUnread`는 두 소스 합산
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useLocation } from "react-router-dom";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

export type ChatRoomSummary = {
  id: string;
  type?: string;
  teamId?: string;
  recruitId?: string;
  postId?: string;
  name?: string;
  lastMessage?: unknown;
  unreadCount?: Record<string, number>;
  members?: string[];
};

export function getUnreadForRoom(
  room: { unreadCount?: Record<string, number> } | null | undefined,
  uid: string | undefined
): number {
  if (!room || !uid) return 0;
  return room.unreadCount?.[uid] ?? 0;
}

/** `chats/{id}` 문서 — ChatListPage와 동일: seq 우선, 없으면 unreadCount */
function unreadForDirectChatDoc(d: QueryDocumentSnapshot, uid: string): number {
  const data = d.data() as {
    unreadCount?: Record<string, number>;
    lastMessageSeq?: number;
    read?: Record<string, { lastReadSeq?: number }>;
  };
  const lastSeq = typeof data.lastMessageSeq === "number" ? data.lastMessageSeq : 0;
  const myReadSeq = data.read?.[uid]?.lastReadSeq ?? 0;
  if (lastSeq > 0) {
    return Math.max(0, lastSeq - myReadSeq);
  }
  const n = data.unreadCount?.[uid];
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
}

type Ctx = {
  rooms: ChatRoomSummary[];
  loading: boolean;
  /** chatRooms + `chats/` 거래 스레드 미읽음 합 */
  totalUnread: number;
  /** 거래 1:1 `chats`만의 미읽음 합 (디버그·분할 UI용) */
  tradeDirectUnread: number;
  getUnreadForTeamId: (teamId: string) => number;
  getRoomByTeamId: (teamId: string) => ChatRoomSummary | undefined;
};

const ChatRoomsUnreadContext = createContext<Ctx | null>(null);

/** Router 안에서만 마운트 (useLocation) */
export function ChatRoomsUnreadProvider({ children }: { children: ReactNode }) {
  return <ChatRoomsUnreadProviderInner>{children}</ChatRoomsUnreadProviderInner>;
}

function ChatRoomsUnreadProviderInner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { pathname, search } = useLocation();
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeDirectUnread, setTradeDirectUnread] = useState(0);
  const chatsByParticipantsRef = useRef(new Map<string, number>());
  const chatsByUsersRef = useRef(new Map<string, number>());
  const prevUnreadRef = useRef<Record<string, number>>({});
  const toastLocRef = useRef({ pathname, search });
  toastLocRef.current = { pathname, search };

  const recomputeTradeDirectUnread = useCallback(() => {
    const merged = new Map<string, number>();
    chatsByParticipantsRef.current.forEach((v, k) => merged.set(k, v));
    chatsByUsersRef.current.forEach((v, k) => merged.set(k, Math.max(merged.get(k) ?? 0, v)));
    let sum = 0;
    merged.forEach((v) => {
      sum += v;
    });
    setTradeDirectUnread(sum);
  }, []);

  useEffect(() => {
    if (!uid) {
      chatsByParticipantsRef.current = new Map();
      chatsByUsersRef.current = new Map();
      setTradeDirectUnread(0);
      return;
    }

    let cancelled = false;
    const CHATS_LIST_LIMIT = 100;
    const qParticipants = query(
      collection(db, "chats"),
      where("participants", "array-contains", uid),
      limit(CHATS_LIST_LIMIT)
    );
    const qUsers = query(
      collection(db, "chats"),
      where("users", "array-contains", uid),
      limit(CHATS_LIST_LIMIT)
    );

    const onErr = (err: unknown) => {
      if (cancelled) return;
      const code = (err as { code?: string })?.code;
      if (code === "permission-denied" || code === "unavailable") return;
      if (import.meta.env.DEV) {
        console.warn("[ChatRoomsUnread] chats unread listener:", err);
      }
    };

    const unsubP = onSnapshot(
      qParticipants,
      (snap) => {
        if (cancelled) return;
        try {
          chatsByParticipantsRef.current = new Map(
            snap.docs.map((d) => [d.id, unreadForDirectChatDoc(d, uid)])
          );
          recomputeTradeDirectUnread();
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn("[ChatRoomsUnread] chats participants snap:", e);
          }
        }
      },
      onErr
    );
    const unsubU = onSnapshot(
      qUsers,
      (snap) => {
        if (cancelled) return;
        try {
          chatsByUsersRef.current = new Map(
            snap.docs.map((d) => [d.id, unreadForDirectChatDoc(d, uid)])
          );
          recomputeTradeDirectUnread();
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn("[ChatRoomsUnread] chats users snap:", e);
          }
        }
      },
      onErr
    );

    return () => {
      cancelled = true;
      try {
        unsubP();
      } catch {
        /* Firestore teardown race */
      }
      try {
        unsubU();
      } catch {
        /* Firestore teardown race */
      }
    };
  }, [uid, recomputeTradeDirectUnread]);

  useEffect(() => {
    if (!uid) {
      prevUnreadRef.current = {};
      setRooms([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const q = query(
      collection(db, "chatRooms"),
      where("members", "array-contains", uid)
    );

    /** onSnapshot은 동기 콜백이어야 함 — async/await는 Firestore INTERNAL ASSERTION을 유발할 수 있음 */
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (cancelled) return;
        try {
          setRooms(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ChatRoomSummary, "id">),
            }))
          );
          setLoading(false);

          const { pathname: p, search: s } = toastLocRef.current;
          const toastJobs: Array<{ title: string; preview: string }> = [];

          for (const ch of snap.docChanges()) {
            if (ch.type === "removed") {
              delete prevUnreadRef.current[ch.doc.id];
              continue;
            }
            if (ch.type === "added") {
              const d = ch.doc.data() as ChatRoomSummary;
              prevUnreadRef.current[ch.doc.id] = d.unreadCount?.[uid] ?? 0;
              continue;
            }
            if (ch.type !== "modified") continue;

            const room: ChatRoomSummary = {
              id: ch.doc.id,
              ...(ch.doc.data() as Omit<ChatRoomSummary, "id">),
            };
            const now = room.unreadCount?.[uid] ?? 0;
            const prev = prevUnreadRef.current[room.id] ?? 0;
            prevUnreadRef.current[room.id] = now;

            if (!(now > prev && now > 0)) continue;
            if (shouldSuppressChatRoomsToast(p, s, room)) continue;

            const title =
              room.name ||
              (room.type === "recruit_group" ? "모집 채팅" : "채팅");
            const last = room.lastMessage;
            const raw =
              typeof last === "string"
                ? last
                : (last as { text?: string } | undefined)?.text || "새 메시지";
            toastJobs.push({ title, preview: String(raw).slice(0, 40) });
          }

          if (toastJobs.length === 0) return;

          // Firestore 스냅샷 콜백 밖에서 비동기 처리 (SDK 내부 상태 보호)
          queueMicrotask(() => {
            if (cancelled) return;
            void (async () => {
              try {
                const { toast } = await import("@/lib/notify").catch(() => ({
                  toast: null as {
                    message?: (m: string) => void;
                    success?: (m: string) => void;
                  } | null,
                }));
                for (const job of toastJobs) {
                  if (cancelled) return;
                  const msg = `${job.title}: ${job.preview}`;
                  if (toast?.message) toast.message(msg);
                  else if (toast?.success) toast.success(msg);
                }
                if (
                  typeof navigator !== "undefined" &&
                  (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate
                ) {
                  try {
                    (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(10);
                  } catch {
                    /* noop */
                  }
                }
              } catch {
                /* noop */
              }
            })();
          });
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn("[ChatRoomsUnread] chatRooms snap:", e);
          }
          setLoading(false);
        }
      },
      (err) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.warn("[ChatRoomsUnread] chatRooms listener:", err);
        }
        setRooms([]);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      try {
        unsub();
      } catch {
        /* Firestore teardown race — INTERNAL ASSERTION 완화 */
      }
    };
  }, [uid]);

  const getRoomByTeamId = useCallback(
    (teamId: string) => rooms.find((r) => r.teamId === teamId && r.type === "team"),
    [rooms]
  );

  const getUnreadForTeamId = useCallback(
    (teamId: string) => getUnreadForRoom(getRoomByTeamId(teamId), uid),
    [getRoomByTeamId, uid]
  );

  const chatRoomsUnreadSum = useMemo(
    () => rooms.reduce((sum, r) => sum + getUnreadForRoom(r, uid), 0),
    [rooms, uid]
  );

  const totalUnread = chatRoomsUnreadSum + tradeDirectUnread;

  const value = useMemo(
    () => ({
      rooms,
      loading,
      totalUnread,
      tradeDirectUnread,
      getUnreadForTeamId,
      getRoomByTeamId,
    }),
    [rooms, loading, totalUnread, tradeDirectUnread, getUnreadForTeamId, getRoomByTeamId]
  );

  return (
    <ChatRoomsUnreadContext.Provider value={value}>
      {children}
    </ChatRoomsUnreadContext.Provider>
  );
}

export function useChatRoomsUnread(): Ctx {
  const ctx = useContext(ChatRoomsUnreadContext);
  if (!ctx) {
    throw new Error("useChatRoomsUnread must be used within ChatRoomsUnreadProvider");
  }
  return ctx;
}

/** Provider 밖(테스트/스토리)용 안전 훅 — 없으면 null */
export function useChatRoomsUnreadSafe(): Ctx | null {
  return useContext(ChatRoomsUnreadContext);
}

/** `chatRooms` + 거래 `chats` 미읽음 합산 — `useChatRoomsUnread`와 동일 */
export const useUnifiedChatUnread = useChatRoomsUnread;

/** Provider 밖에서도 동일 API — `useChatRoomsUnreadSafe`와 동일 */
export const useUnifiedChatUnreadSafe = useChatRoomsUnreadSafe;

function shouldSuppressChatRoomsToast(
  pathname: string,
  search: string,
  room: ChatRoomSummary
): boolean {
  const tab = new URLSearchParams(search).get("tab");

  if (pathname.startsWith("/chat/")) {
    const id = pathname.split("/chat/")[1]?.split("/")[0];
    if (id && id === room.id) return true;
  }

  if (room.teamId && pathname === `/team/${room.teamId}` && tab === "chat") {
    return true;
  }

  return false;
}
