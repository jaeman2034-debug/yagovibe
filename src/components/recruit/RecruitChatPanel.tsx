/**
 * 모집 단체방 인라인 패널 — chatRooms + sendMessageCommon
 * (거래 1:1 `chats/`·`ChatRoom.tsx` 와 분리)
 */

import { FormEvent, Fragment, useCallback, useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { sendMessageCommon } from "@/lib/chat/sendMessageCommon";
import { ensureRecruitChatRoom } from "@/services/chat/ensureRecruitChatRoom";
import { markRoomRead } from "@/lib/chat/markRoomRead";
import { ChatInlineMessageBubble, type InlineChatMsg } from "@/components/chat/ChatInlineMessageBubble";
import { ChatPanelAttachButton } from "@/components/chat/ChatPanelAttachButton";
import {
  formatChatListDateLabel,
  isLastInAuthorGroup,
  sameCalendarDay,
  createdAtToDate,
} from "@/lib/chat/inlineChatListFormat";

export function RecruitChatPanel({
  postId,
  authorId,
  title,
  snapshot,
}: {
  postId: string;
  authorId: string;
  title?: string;
  snapshot?: { title?: string; images?: string[]; imageUrl?: string };
}) {
  const CHAT_TAIL_SIZE = 50;
  const CHAT_OLDER_PAGE = 30;
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [olderMsgs, setOlderMsgs] = useState<InlineChatMsg[]>([]);
  const [tailMsgs, setTailMsgs] = useState<InlineChatMsg[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [lastReadAtMap, setLastReadAtMap] = useState<Record<string, unknown>>({});
  const [roomMembers, setRoomMembers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const messages = [...olderMsgs, ...tailMsgs];

  const toMillis = (v: unknown): number => {
    if (!v) return 0;
    const ts = v as { toDate?: () => Date };
    if (typeof ts.toDate === "function") {
      const d = ts.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? 0 : v.getTime();
    return 0;
  };

  useEffect(() => {
    if (!user?.uid || !postId || !authorId) {
      setRoomId(null);
      return;
    }
    let cancelled = false;
    setBootError(null);
    ensureRecruitChatRoom({
      postId,
      userId: user.uid,
      authorId,
      postTitle: title,
      postSnapshot: snapshot,
    })
      .then((id) => {
        if (!cancelled) setRoomId(id);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setRoomId(null);
          setBootError(e instanceof Error ? e.message : "채팅방을 열 수 없습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, postId, authorId]);

  useEffect(() => {
    if (!roomId) {
      setOlderMsgs([]);
      setTailMsgs([]);
      setHasMoreOlder(true);
      return;
    }
    nearBottomRef.current = true;
    const q = query(
      collection(db, "chatRooms", roomId, "messages"),
      orderBy("createdAt", "desc"),
      limit(CHAT_TAIL_SIZE)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const asc = [...snap.docs]
          .reverse()
          .map((d) => ({ id: d.id, ...(d.data() as Omit<InlineChatMsg, "id">) }));
        setTailMsgs(asc);
        if (snap.docs.length < CHAT_TAIL_SIZE) setHasMoreOlder(false);
      },
      (err) => {
        console.warn("[RecruitChatPanel] messages:", err);
        setTailMsgs([]);
      }
    );
    return () => unsub();
  }, [roomId]);

  const loadOlderMessages = useCallback(async () => {
    if (!roomId || loadingOlder || !hasMoreOlder) return;
    const oldest = messages[0];
    if (!oldest?.id) {
      setHasMoreOlder(false);
      return;
    }
    setLoadingOlder(true);
    const box = listRef.current;
    const prevHeight = box?.scrollHeight ?? 0;
    const prevTop = box?.scrollTop ?? 0;
    try {
      const anchorRef = doc(db, "chatRooms", roomId, "messages", oldest.id);
      const anchorSnap = await getDoc(anchorRef);
      if (!anchorSnap.exists()) {
        setHasMoreOlder(false);
        return;
      }
      const olderQ = query(
        collection(db, "chatRooms", roomId, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(anchorSnap),
        limit(CHAT_OLDER_PAGE)
      );
      const snap = await getDocs(olderQ);
      if (snap.empty) {
        setHasMoreOlder(false);
        return;
      }
      const batchAsc = [...snap.docs]
        .reverse()
        .map((d) => ({ id: d.id, ...(d.data() as Omit<InlineChatMsg, "id">) }));
      setOlderMsgs((prev) => [...batchAsc, ...prev]);
      if (snap.docs.length < CHAT_OLDER_PAGE) setHasMoreOlder(false);
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (!el) return;
        const newHeight = el.scrollHeight;
        el.scrollTop = newHeight - prevHeight + prevTop;
      });
    } catch (e) {
      console.warn("[RecruitChatPanel] older load:", e);
    } finally {
      setLoadingOlder(false);
    }
  }, [roomId, loadingOlder, hasMoreOlder, messages]);

  useEffect(() => {
    if (!roomId) {
      setLastReadAtMap({});
      setRoomMembers([]);
      return;
    }
    const roomRef = doc(db, "chatRooms", roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) {
        setLastReadAtMap({});
        setRoomMembers([]);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      const lr = data.lastReadAt;
      const members = data.members;
      setLastReadAtMap(
        lr && typeof lr === "object" && !Array.isArray(lr) ? (lr as Record<string, unknown>) : {}
      );
      setRoomMembers(Array.isArray(members) ? (members as string[]) : []);
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (nearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [tailMsgs.length, roomId]);

  useEffect(() => {
    if (!roomId || !user?.uid) return;
    void markRoomRead(roomId, user.uid);
  }, [roomId, user?.uid, messages.length]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distanceFromBottom < 120;
    if (el.scrollTop < 80 && hasMoreOlder && !loadingOlder) {
      void loadOlderMessages();
    }
  }, [hasMoreOlder, loadingOlder, loadOlderMessages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomId || !user?.uid) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await sendMessageCommon({ roomId, uid: user.uid, text: trimmed });
      setText("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return <p className="text-sm text-gray-500">로그인 후 채팅할 수 있어요.</p>;
  }

  if (bootError) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{bootError}</p>;
  }

  if (!roomId) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="text-sm">채팅방 연결 중…</span>
      </div>
    );
  }

  const myUid = user.uid;
  const lastMyMessageId = (() => {
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      const m = messages[idx];
      if ((m.senderId || "") === myUid) return m.id;
    }
    return null;
  })();

  return (
    <div className="flex max-h-[min(420px,65vh)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div ref={listRef} className="flex-1 overflow-y-auto p-3" onScroll={handleScroll}>
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">첫 인사를 남겨보세요.</p>
        ) : (
          <>
          {loadingOlder ? (
            <div className="mb-2 text-center text-[11px] text-gray-400">이전 메시지 불러오는 중…</div>
          ) : null}
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const isMine = (msg.senderId || "") === myUid;
            const isGroupEnd = isLastInAuthorGroup(msg, next);
            const isLastMyMessage = isMine && msg.id === lastMyMessageId;
            const msgMs = toMillis(msg.createdAt);
            const otherMembers = roomMembers.filter((uid) => uid && uid !== myUid);
            const anyPeerRead = msgMs
              ? otherMembers.some((uid) => toMillis(lastReadAtMap[uid]) >= msgMs)
              : false;
            const readState =
              isMine && isGroupEnd
                ? anyPeerRead
                  ? ("read" as const)
                  : isLastMyMessage
                    ? ("unread" as const)
                    : null
                : null;
            const isNewDay =
              !prev ||
              !sameCalendarDay(createdAtToDate(prev.createdAt), createdAtToDate(msg.createdAt));
            const dateLabel = formatChatListDateLabel(msg.createdAt);
            return (
              <Fragment key={msg.id}>
                {isNewDay && dateLabel ? (
                  <div className="my-3 text-center text-[11px] text-gray-400 dark:text-gray-500">
                    {dateLabel}
                  </div>
                ) : null}
                <ChatInlineMessageBubble
                  msg={msg}
                  isMine={isMine}
                  variant="recruit"
                  showTimeRow={isGroupEnd}
                  readState={readState}
                />
              </Fragment>
            );
          })}
          </>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 p-3">
        <ChatPanelAttachButton roomId={roomId} uid={user.uid} disabled={sending} />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력"
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !text.trim()}>
          전송
        </Button>
      </form>
    </div>
  );
}
