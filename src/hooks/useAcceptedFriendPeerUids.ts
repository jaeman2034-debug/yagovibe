import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FriendshipDoc } from "@/types/social";

/**
 * 수락된 친구의 peer uid 목록 (본인 제외, 순서 비보장).
 */
export function useAcceptedFriendPeerUids(uid: string | undefined, isAnonymous: boolean | undefined) {
  const [peerUids, setPeerUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(uid && !isAnonymous));

  useEffect(() => {
    if (!uid || isAnonymous) {
      setPeerUids([]);
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
        const peers: string[] = [];
        snap.docs.forEach((d) => {
          const data = d.data() as FriendshipDoc;
          const users = data.users;
          if (Array.isArray(users) && users.length === 2) {
            const other = users.find((u) => u !== uid);
            if (other && typeof other === "string") peers.push(other);
          }
        });
        setPeerUids(peers);
        setLoading(false);
      },
      () => {
        setPeerUids([]);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid, isAnonymous]);

  return { peerUids, loading };
}
