import { useEffect, useMemo, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

function unreadForRoomDoc(data: Record<string, unknown>, myUid: string): number {
  const lastSeq = typeof data.lastMessageSeq === "number" ? data.lastMessageSeq : 0;
  const readMap = data.read as { [uid: string]: { lastReadSeq?: number } } | undefined;
  const myReadSeq = readMap?.[myUid]?.lastReadSeq ?? 0;
  const unreadFromSeq = Math.max(0, lastSeq - myReadSeq);
  const unreadMap = data.unreadCount as { [uid: string]: number } | undefined;
  const unreadFromCount = unreadMap?.[myUid] ?? 0;
  return lastSeq > 0 ? unreadFromSeq : unreadFromCount;
}

/**
 * 스포츠 허브 리텐션용 — 채팅 미읽음 합계 (chatRooms + chats 1:1)
 */
export function useSportsHubRetentionSignals() {
  const { user } = useAuth();
  const myUid = user?.uid;
  const [roomUnreadSum, setRoomUnreadSum] = useState(0);
  const [directUnreadSum, setDirectUnreadSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const readyRef = useRef({ rooms: false, direct: false });

  useEffect(() => {
    if (!myUid) {
      setRoomUnreadSum(0);
      setDirectUnreadSum(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    readyRef.current = { rooms: false, direct: false };

    const tryFinishLoading = () => {
      if (cancelled) return;
      if (readyRef.current.rooms && readyRef.current.direct) setLoading(false);
    };

    const qRooms = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", myUid),
      orderBy("lastMessageAt", "desc"),
      limit(50)
    );

    const unsubRooms = onSnapshot(
      qRooms,
      (snap) => {
        if (cancelled) return;
        let sum = 0;
        snap.docs.forEach((d) => {
          sum += unreadForRoomDoc(d.data() as Record<string, unknown>, myUid);
        });
        setRoomUnreadSum(sum);
        readyRef.current.rooms = true;
        tryFinishLoading();
      },
      () => {
        if (!cancelled) setRoomUnreadSum(0);
        readyRef.current.rooms = true;
        tryFinishLoading();
      }
    );

    const qDirect = query(collection(db, "chats"), where("participants", "array-contains", myUid), limit(60));

    const unsubDirect = onSnapshot(
      qDirect,
      (snap) => {
        if (cancelled) return;
        let sum = 0;
        snap.docs.forEach((d) => {
          sum += unreadForRoomDoc(d.data() as Record<string, unknown>, myUid);
        });
        setDirectUnreadSum(sum);
        readyRef.current.direct = true;
        tryFinishLoading();
      },
      () => {
        if (!cancelled) setDirectUnreadSum(0);
        readyRef.current.direct = true;
        tryFinishLoading();
      }
    );

    return () => {
      cancelled = true;
      unsubRooms();
      unsubDirect();
    };
  }, [myUid]);

  const chatUnreadTotal = useMemo(() => roomUnreadSum + directUnreadSum, [roomUnreadSum, directUnreadSum]);

  return { chatUnreadTotal, loading };
}
