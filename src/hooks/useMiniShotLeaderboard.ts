import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { devError } from "@/lib/utils/dev";

const TOP_N = 10;

export type MiniShotLeaderboardRow = {
  rank: number;
  userId: string;
  bestScore: number;
  displayName: string;
  superBadgeCount: number;
};

function pickUserDisplayName(data: DocumentData | undefined, uid: string): string {
  const raw = data?.displayName ?? data?.nickname ?? data?.name;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const short = uid.length > 6 ? `${uid.slice(0, 6)}…` : uid;
  return `플레이어 ${short}`;
}

type HookOptions = {
  /** false면 구독 안 함 (모달·탭 등에서 끄기) */
  enabled?: boolean;
};

export function useMiniShotLeaderboard(
  teamId: string | undefined,
  viewerUid: string | null | undefined,
  options?: HookOptions
) {
  const enabled = options?.enabled !== false && !!teamId?.trim();
  const tid = teamId?.trim() ?? "";

  const [topDocs, setTopDocs] = useState<
    { id: string; bestScore: number }[]
  >([]);
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
  const [superBadgeCountByUserId, setSuperBadgeCountByUserId] = useState<Record<string, number>>({});
  const [myBestScore, setMyBestScore] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loadingTop, setLoadingTop] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /** 상위 N명 실시간 */
  useEffect(() => {
    if (!enabled || !tid) {
      setTopDocs([]);
      setLoadingTop(false);
      setError(null);
      return;
    }

    setLoadingTop(true);
    const col = collection(db, "teams", tid, "miniShotLeaderboard");
    const q = query(col, orderBy("bestScore", "desc"), limit(TOP_N));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const raw = d.data().bestScore;
          const bestScore = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
          return { id: d.id, bestScore };
        });
        setTopDocs(rows);
        setError(null);
        setLoadingTop(false);
      },
      (err) => {
        devError("[useMiniShotLeaderboard] top 조회 실패:", err);
        setError(err as Error);
        setTopDocs([]);
        setLoadingTop(false);
      }
    );

    return () => unsub();
  }, [enabled, tid]);

  /** 내 문서 + 순위 (bestScore보다 높은 사람 수 + 1) */
  useEffect(() => {
    if (!enabled || !tid || !viewerUid?.trim()) {
      setMyBestScore(null);
      setMyRank(null);
      return;
    }

    const uid = viewerUid.trim();
    const ref = doc(db, "teams", tid, "miniShotLeaderboard", uid);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          setMyBestScore(null);
          setMyRank(null);
          return;
        }
        const raw = snap.data().bestScore;
        const bs =
          typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
        setMyBestScore(bs);

        try {
          const col = collection(db, "teams", tid, "miniShotLeaderboard");
          const cntQ = query(col, where("bestScore", ">", bs));
          const agg = await getCountFromServer(cntQ);
          setMyRank(agg.data().count + 1);
        } catch (e) {
          devError("[useMiniShotLeaderboard] 순위 집계 실패:", e);
          setMyRank(null);
        }
      },
      (err) => {
        devError("[useMiniShotLeaderboard] 내 기록 구독 실패:", err);
        setMyBestScore(null);
        setMyRank(null);
      }
    );

    return () => unsub();
  }, [enabled, tid, viewerUid]);

  /** Top N displayName 로드 */
  useEffect(() => {
    if (!enabled || topDocs.length === 0) {
      return;
    }

    let cancelled = false;
    const ids = [...new Set(topDocs.map((r) => r.id))];

    (async () => {
      const entries = await Promise.all(
        ids.map(async (uid) => {
          const uref = doc(db, "users", uid);
          const usnap = await getDoc(uref);
          const label = pickUserDisplayName(usnap.exists() ? usnap.data() : undefined, uid);
          const superBadgeRef = doc(db, "users", uid, "badges", "super7");
          const superBadgeSnap = await getDoc(superBadgeRef);
          const superBadgeCount = superBadgeSnap.exists()
            ? Math.max(1, Math.floor(Number(superBadgeSnap.data().count ?? 1)))
            : 0;
          return [uid, label, superBadgeCount] as const;
        })
      );
      if (cancelled) return;
      setNameByUserId((prev) => {
        const next = { ...prev };
        for (const [uid, label] of entries) next[uid] = label;
        return next;
      });
      setSuperBadgeCountByUserId((prev) => {
        const next = { ...prev };
        for (const [uid, , count] of entries) next[uid] = count;
        return next;
      });
    })().catch((e) => devError("[useMiniShotLeaderboard] 이름 로드 실패:", e));

    return () => {
      cancelled = true;
    };
  }, [enabled, topDocs]);

  const topRows: MiniShotLeaderboardRow[] = useMemo(() => {
    return topDocs.map((d, idx) => ({
      rank: idx + 1,
      userId: d.id,
      bestScore: d.bestScore,
      displayName: nameByUserId[d.id] ?? pickUserDisplayName(undefined, d.id),
      superBadgeCount: superBadgeCountByUserId[d.id] ?? 0,
    }));
  }, [topDocs, nameByUserId, superBadgeCountByUserId]);

  const myRankInTop = useMemo(() => {
    if (!viewerUid?.trim()) return null;
    const u = viewerUid.trim();
    const idx = topRows.findIndex((r) => r.userId === u);
    return idx >= 0 ? idx + 1 : null;
  }, [topRows, viewerUid]);

  return {
    topRows,
    loadingTop,
    myBestScore,
    myRank,
    myRankInTop,
    error,
    topLimit: TOP_N,
  };
}
