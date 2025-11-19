import { useCallback, useMemo, useState } from "react";

export function useInfiniteScroll<T>(items: T[], pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = visibleItems.length < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + pageSize);
  }, [pageSize]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  return { visibleItems, hasMore, loadMore, reset };
}


