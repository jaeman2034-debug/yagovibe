import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  fetchMarketPostsPage,
  normalizeMarketListCategory,
  normalizeMarketListSort,
  type MarketListCategoryFilter,
  type MarketListSort,
} from "@/services/marketService";
import type { MarketPost } from "@/types/market";
import { track } from "@/lib/analytics";

export interface MarketListState {
  items: MarketPost[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot | null;
}

const PAGE_SIZE = 20;

/**
 * `/sports/:sport/market` 리스트 — Firestore는 `marketService.fetchMarketPostsPage` 만 사용
 */
export function useMarketList(
  sport: string,
  sortParam: string | null | undefined,
  categoryParam: string | null | undefined,
  source?: string | null
) {
  const sort: MarketListSort = normalizeMarketListSort(sortParam);
  const category: MarketListCategoryFilter = normalizeMarketListCategory(categoryParam);

  const [items, setItems] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [indexUnavailable, setIndexUnavailable] = useState(false);

  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);
  const hasMoreRef = useRef(true);
  const loadMoreLock = useRef(false);
  /** sport/sort 변경 시 이전 페이지 요청 결과 무시 */
  const genRef = useRef(0);

  useEffect(() => {
    lastDocRef.current = lastDoc;
  }, [lastDoc]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    const myGen = ++genRef.current;

    if (!sport || sport === "all") {
      setItems([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      setLastDoc(null);
      lastDocRef.current = null;
      hasMoreRef.current = false;
      return;
    }

    let cancelled = false;
    loadMoreLock.current = false;

    async function initial() {
      setLoading(true);
      setError(null);
      setItems([]);
      setLastDoc(null);
      lastDocRef.current = null;
      setHasMore(true);
      hasMoreRef.current = true;
      setIndexUnavailable(false);

      try {
        const { items: first, lastDoc: ld, hasMore: more, indexUnavailable: idx } =
          await fetchMarketPostsPage({
            sport,
            sort,
            category: category === "all" ? null : category,
            pageSize: PAGE_SIZE,
          });
        if (cancelled || genRef.current !== myGen) return;
        setIndexUnavailable(!!idx);
        setItems(first);
        setLastDoc(ld);
        lastDocRef.current = ld;
        setHasMore(more);
        hasMoreRef.current = more;
        try {
          track("market_list_open", {
            sport,
            sort,
            category,
            source: source ?? "default",
          });
        } catch {
          /* ignore */
        }
      } catch (e: unknown) {
        if (cancelled || genRef.current !== myGen) return;
        const msg = e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
        setError(msg);
        setItems([]);
        setLastDoc(null);
        lastDocRef.current = null;
        setHasMore(false);
        hasMoreRef.current = false;
      } finally {
        if (!cancelled && genRef.current === myGen) setLoading(false);
      }
    }

    void initial();
    return () => {
      cancelled = true;
    };
  }, [sport, sort, category, source]);

  const loadMore = useCallback(async () => {
    if (loadMoreLock.current || !hasMoreRef.current || !lastDocRef.current) return;
    const myGen = genRef.current;
    loadMoreLock.current = true;
    setLoadingMore(true);
    try {
      const { items: next, lastDoc: ld, hasMore: more } = await fetchMarketPostsPage({
        sport,
        sort,
        category: category === "all" ? null : category,
        pageSize: PAGE_SIZE,
        startAfterDoc: lastDocRef.current,
      });
      if (genRef.current !== myGen) return;
      setItems((prev) => [...prev, ...next]);
      setLastDoc(ld);
      lastDocRef.current = ld;
      setHasMore(more);
      hasMoreRef.current = more;
    } catch (e: unknown) {
      if (genRef.current !== myGen) return;
      const msg = e instanceof Error ? e.message : "더 불러오기에 실패했습니다.";
      setError(msg);
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      if (genRef.current === myGen) {
        setLoadingMore(false);
      }
      loadMoreLock.current = false;
    }
  }, [sport, sort, category]);

  const state: MarketListState = {
    items,
    loading,
    error,
    hasMore,
    lastDoc,
  };

  return { ...state, loadingMore, loadMore, indexUnavailable };
}
