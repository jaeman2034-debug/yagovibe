import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSportId } from "@/constants/sports";
import { isSportTypeSlug } from "@/types/sport";
import type { Activity } from "@/types/activity";

const DEFAULT_PAGE = 20;

function docToActivity(id: string, data: DocumentData): Activity {
  return {
    id,
    type: (data.type as Activity["type"]) || "market_created",
    refType: (data.refType as Activity["refType"]) || "market",
    refId: (data.refId as string) || id,
    refCollection: data.refCollection as Activity["refCollection"] | undefined,
    authorId: (data.authorId as string) || "",
    teamId: data.teamId as string | undefined,
    title: (data.title as string) || "",
    summary: data.summary as string | undefined,
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    visibility: (data.visibility as Activity["visibility"]) || "public",
    likeCount: typeof data.likeCount === "number" ? data.likeCount : 0,
    commentCount: typeof data.commentCount === "number" ? data.commentCount : 0,
    createdAt: data.createdAt as Activity["createdAt"],
    createdAtMillis:
      typeof data.createdAtMillis === "number" ? data.createdAtMillis : undefined,
    sport: (data.sport as string) || "",
    category: data.category as string | undefined,
  };
}

/** 팀 피드: 스냅샷 첫 페이지 + 페이지네이션 tail 병합 (live가 우선) */
function mergeActivitiesByNewest(live: Activity[], older: Activity[]): Activity[] {
  const map = new Map<string, Activity>();
  for (const o of older) map.set(o.id, o);
  for (const l of live) map.set(l.id, l);
  return [...map.values()].sort(
    (a, b) => (b.createdAtMillis ?? 0) - (a.createdAtMillis ?? 0)
  );
}

export interface UseActivityFeedOptions {
  /** 공개 피드: 종목 slug. 팀 피드에서는 무시 */
  sport?: string;
  /** 팀 피드: `visibility: "team"`과 함께 사용 */
  teamId?: string;
  visibility?: "public" | "team";
  pageSize?: number;
}

/**
 * `activities` 페이지네이션 — 공개(Community) 또는 팀 전용(`teamId` + `visibility: team`)
 * 팀 피드: 첫 페이지만 `onSnapshot`, 이후 `loadMore`는 `getDocs` 유지
 */
export function useActivityFeed(options: UseActivityFeedOptions) {
  const sportParam = options.sport ?? "all";
  const teamIdRaw = options.teamId?.trim() ?? "";
  const visibility = options.visibility ?? "public";
  const pageSize = options.pageSize ?? DEFAULT_PAGE;

  const isTeamFeed = visibility === "team";
  const invalidTeamFeed = isTeamFeed && !teamIdRaw;

  const sportFilter = (() => {
    if (isTeamFeed) return null;
    if (!sportParam || sportParam === "all") return null;
    const n = normalizeSportId(sportParam);
    if (!n || !isSportTypeSlug(n)) return null;
    return n;
  })();

  const [publicItems, setPublicItems] = useState<Activity[]>([]);
  const [liveItems, setLiveItems] = useState<Activity[]>([]);
  const [olderItems, setOlderItems] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [indexUnavailable, setIndexUnavailable] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const snapMapRef = useRef(new Map<string, QueryDocumentSnapshot<DocumentData>>());
  const headHasMoreRef = useRef(false);
  const tailHasMoreRef = useRef(false);
  const genRef = useRef(0);
  const loadLock = useRef(false);

  const syncHasMore = useCallback(() => {
    setHasMore(headHasMoreRef.current || tailHasMoreRef.current);
  }, []);

  const mergedTeamItems = useMemo(
    () => (isTeamFeed ? mergeActivitiesByNewest(liveItems, olderItems) : []),
    [isTeamFeed, liveItems, olderItems]
  );

  const items = isTeamFeed ? mergedTeamItems : publicItems;

  const refetch = useCallback(() => {
    if (isTeamFeed) {
      setOlderItems([]);
      tailHasMoreRef.current = false;
      setHasMore(headHasMoreRef.current);
    } else {
      setReloadNonce((n) => n + 1);
    }
  }, [isTeamFeed]);

  const buildQuery = useCallback(
    (startAfterDoc: QueryDocumentSnapshot<DocumentData> | null) => {
      const cond: QueryConstraint[] = [];
      if (isTeamFeed) {
        cond.push(where("teamId", "==", teamIdRaw));
        cond.push(where("visibility", "==", "team"));
      } else {
        cond.push(where("visibility", "==", visibility));
        if (sportFilter) {
          cond.push(where("sport", "==", sportFilter));
        }
      }
      cond.push(orderBy("createdAt", "desc"));
      if (startAfterDoc) {
        cond.push(startAfter(startAfterDoc));
      }
      cond.push(limit(pageSize + 1));
      return query(collection(db, "activities"), ...cond);
    },
    [isTeamFeed, teamIdRaw, visibility, sportFilter, pageSize]
  );

  /* ---------- 팀 피드: 첫 페이지 onSnapshot ---------- */
  useEffect(() => {
    if (!isTeamFeed || invalidTeamFeed) return undefined;

    let cancelled = false;
    const myGen = ++genRef.current;
    loadLock.current = false;
    snapMapRef.current = new Map();
    headHasMoreRef.current = false;
    tailHasMoreRef.current = false;
    setOlderItems([]);
    syncHasMore();

    setLoading(true);
    setError(null);
    setIndexUnavailable(false);
    setLiveItems([]);

    const q = buildQuery(null);
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (cancelled || genRef.current !== myGen) return;
        try {
          const rawDocs = snap.docs;
          const more = rawDocs.length > pageSize;
          const pageDocs = more ? rawDocs.slice(0, pageSize) : rawDocs;

          for (const d of pageDocs) {
            snapMapRef.current.set(d.id, d);
          }

          const list = pageDocs.map((d) => docToActivity(d.id, d.data()));
          setLiveItems(list);
          setOlderItems((prev) => prev.filter((o) => !list.some((l) => l.id === o.id)));
          headHasMoreRef.current = more;
          syncHasMore();
        } catch (e: unknown) {
          if (cancelled || genRef.current !== myGen) return;
          const code = (e as { code?: string })?.code;
          const msg = String((e as { message?: string })?.message ?? "");
          if (code === "failed-precondition" || msg.includes("index")) {
            setIndexUnavailable(true);
            setLiveItems([]);
            setOlderItems([]);
            setHasMore(false);
          } else {
            setError(e instanceof Error ? e.message : "피드를 불러오지 못했습니다.");
            setLiveItems([]);
            setOlderItems([]);
            setHasMore(false);
          }
        } finally {
          if (!cancelled && genRef.current === myGen) setLoading(false);
        }
      },
      (e) => {
        if (cancelled || genRef.current !== myGen) return;
        const code = (e as { code?: string })?.code;
        const msg = String((e as { message?: string })?.message ?? "");
        if (code === "failed-precondition" || msg.includes("index")) {
          setIndexUnavailable(true);
          setLiveItems([]);
          setOlderItems([]);
          setHasMore(false);
        } else {
          setError(e instanceof Error ? e.message : "피드를 불러오지 못했습니다.");
          setLiveItems([]);
          setOlderItems([]);
          setHasMore(false);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [buildQuery, invalidTeamFeed, isTeamFeed, pageSize, syncHasMore]);

  /* ---------- 공개 피드: 초기 getDocs ---------- */
  useEffect(() => {
    if (isTeamFeed) return undefined;

    const myGen = ++genRef.current;
    lastDocRef.current = null;
    loadLock.current = false;
    let cancelled = false;

    async function initial() {
      setLoading(true);
      setError(null);
      setPublicItems([]);
      setHasMore(true);
      setIndexUnavailable(false);

      try {
        const snap = await getDocs(buildQuery(null));
        if (cancelled || genRef.current !== myGen) return;

        const rawDocs = snap.docs;
        const more = rawDocs.length > pageSize;
        const pageDocs = more ? rawDocs.slice(0, pageSize) : rawDocs;

        let list = pageDocs.map((d) => docToActivity(d.id, d.data()));

        if (sportParam !== "all" && !sportFilter) {
          const n = normalizeSportId(sportParam);
          list = list.filter((row) => {
            const rs = row.sport || "";
            return rs === sportParam || normalizeSportId(rs) === n;
          });
        }

        setPublicItems(list);
        lastDocRef.current = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1]! : null;
        setHasMore(more);
      } catch (e: unknown) {
        if (cancelled || genRef.current !== myGen) return;
        const code = (e as { code?: string })?.code;
        const msg = String((e as { message?: string })?.message ?? "");
        if (code === "failed-precondition" || msg.includes("index")) {
          setIndexUnavailable(true);
          setPublicItems([]);
          setHasMore(false);
        } else {
          setError(e instanceof Error ? e.message : "피드를 불러오지 못했습니다.");
          setPublicItems([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled && genRef.current === myGen) setLoading(false);
      }
    }

    void initial();
    return () => {
      cancelled = true;
    };
  }, [buildQuery, isTeamFeed, sportParam, sportFilter, pageSize, reloadNonce]);

  /* ---------- invalid 팀 피드 ---------- */
  useEffect(() => {
    if (!invalidTeamFeed) return;
    setPublicItems([]);
    setLiveItems([]);
    setOlderItems([]);
    setLoading(false);
    setError(null);
    setHasMore(false);
    setIndexUnavailable(false);
  }, [invalidTeamFeed]);

  const loadMore = useCallback(async () => {
    if (invalidTeamFeed || loadLock.current || !hasMore) return;

    if (isTeamFeed) {
      const myGen = genRef.current;
      loadLock.current = true;
      setLoadingMore(true);
      try {
        const merged = mergeActivitiesByNewest(liveItems, olderItems);
        const last = merged[merged.length - 1];
        const cursor = last ? snapMapRef.current.get(last.id) : undefined;
        if (!last || !cursor) {
          setHasMore(false);
          return;
        }

        const snap = await getDocs(buildQuery(cursor));
        if (genRef.current !== myGen) return;

        const rawDocs = snap.docs;
        const more = rawDocs.length > pageSize;
        const pageDocs = more ? rawDocs.slice(0, pageSize) : rawDocs;

        for (const d of pageDocs) {
          snapMapRef.current.set(d.id, d);
        }

        const page = pageDocs.map((d) => docToActivity(d.id, d.data()));

        if (page.length === 0) {
          tailHasMoreRef.current = false;
          syncHasMore();
          return;
        }

        setOlderItems((prev) => {
          const seen = new Set(liveItems.map((l) => l.id));
          for (const p of prev) seen.add(p.id);
          const out = [...prev];
          for (const row of page) {
            if (!seen.has(row.id)) {
              seen.add(row.id);
              out.push(row);
            }
          }
          return out;
        });

        tailHasMoreRef.current = more;
        syncHasMore();
      } catch (e: unknown) {
        if (genRef.current !== myGen) return;
        setError(e instanceof Error ? e.message : "더 불러오기에 실패했습니다.");
        tailHasMoreRef.current = false;
        syncHasMore();
      } finally {
        if (genRef.current === myGen) {
          setLoadingMore(false);
        }
        loadLock.current = false;
      }
      return;
    }

    if (!lastDocRef.current) return;
    const myGen = genRef.current;
    loadLock.current = true;
    setLoadingMore(true);
    try {
      const snap = await getDocs(buildQuery(lastDocRef.current));
      if (genRef.current !== myGen) return;

      const rawDocs = snap.docs;
      const more = rawDocs.length > pageSize;
      const pageDocs = more ? rawDocs.slice(0, pageSize) : rawDocs;

      let page = pageDocs.map((d) => docToActivity(d.id, d.data()));
      if (sportParam !== "all" && !sportFilter) {
        const n = normalizeSportId(sportParam);
        page = page.filter((row) => {
          const rs = row.sport || "";
          return rs === sportParam || normalizeSportId(rs) === n;
        });
      }

      if (page.length === 0) {
        setHasMore(false);
        return;
      }

      setPublicItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const row of page) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return merged;
      });

      lastDocRef.current = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1]! : null;
      setHasMore(more);
    } catch (e: unknown) {
      if (genRef.current !== myGen) return;
      setError(e instanceof Error ? e.message : "더 불러오기에 실패했습니다.");
      setHasMore(false);
    } finally {
      if (genRef.current === myGen) {
        setLoadingMore(false);
      }
      loadLock.current = false;
    }
  }, [
    buildQuery,
    hasMore,
    invalidTeamFeed,
    isTeamFeed,
    liveItems,
    olderItems,
    pageSize,
    sportFilter,
    sportParam,
    syncHasMore,
  ]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    indexUnavailable,
    refetch,
  };
}
