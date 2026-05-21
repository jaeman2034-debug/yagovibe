import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 수락된 친구 관계 수 (`friendships` where users contains uid and status accepted).
 */
export function useAcceptedFriendCount(uid: string | undefined, isAnonymous: boolean | undefined) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(uid && !isAnonymous));

  useEffect(() => {
    if (!uid || isAnonymous) {
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "friendships"),
      where("users", "array-contains", uid),
      where("status", "==", "accepted"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCount(snap.size);
        setLoading(false);
      },
      () => {
        setCount(0);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid, isAnonymous]);

  return { count, loading };
}
