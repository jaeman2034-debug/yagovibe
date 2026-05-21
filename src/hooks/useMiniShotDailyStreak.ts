import { useEffect, useState } from "react";
import { collection, documentId, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { devError } from "@/lib/utils/dev";

function todayKeyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function previousDayKey(key: string): string {
  if (!/^\d{8}$/.test(key)) return key;
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  const d = Number(key.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function useMiniShotDailyStreak(viewerUid?: string | null, enabled = true) {
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = typeof viewerUid === "string" ? viewerUid.trim() : "";
    if (!enabled || !uid) {
      setStreakDays(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const col = collection(db, "users", uid, "miniShotDailyHistory");
    const q = query(col, orderBy(documentId(), "desc"), limit(21));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const clearedByKey = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.cleared === true) clearedByKey.add(d.id);
        });
        let streak = 0;
        let cursor = todayKeyLocal();
        for (let i = 0; i < 21; i++) {
          if (!clearedByKey.has(cursor)) break;
          streak += 1;
          cursor = previousDayKey(cursor);
        }
        setStreakDays(streak);
        setLoading(false);
      },
      (err) => {
        devError("useMiniShotDailyStreak 구독 실패:", err);
        setStreakDays(0);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [viewerUid, enabled]);

  return { streakDays, loading };
}

