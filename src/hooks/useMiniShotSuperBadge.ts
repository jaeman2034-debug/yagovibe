import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { devError } from "@/lib/utils/dev";

type MiniShotSuperBadge = {
  achieved: boolean;
  count: number;
  title: string;
  description: string;
};

const defaultBadge: MiniShotSuperBadge = {
  achieved: false,
  count: 0,
  title: "SUPER STRIKER",
  description: "7일 연속 슈퍼 챌린지 클리어",
};

export function useMiniShotSuperBadge(viewerUid?: string | null, enabled = true) {
  const [badge, setBadge] = useState<MiniShotSuperBadge>(defaultBadge);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = typeof viewerUid === "string" ? viewerUid.trim() : "";
    if (!enabled || !uid) {
      setBadge(defaultBadge);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", uid, "badges", "super7");
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setBadge(defaultBadge);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setBadge({
          achieved: true,
          count: Math.max(1, Math.floor(Number(data.count ?? 1))),
          title: typeof data.title === "string" && data.title.trim() ? data.title : defaultBadge.title,
          description:
            typeof data.description === "string" && data.description.trim()
              ? data.description
              : defaultBadge.description,
        });
        setLoading(false);
      },
      (err) => {
        devError("useMiniShotSuperBadge 구독 실패:", err);
        setBadge(defaultBadge);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [viewerUid, enabled]);

  return { badge, loading };
}

