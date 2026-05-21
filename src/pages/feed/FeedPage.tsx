import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAssociationById } from "@/services/associationService";
import { listGlobalFeedPosts, type AssociationPost } from "@/services/associationPostService";

type SortMode = "latest" | "hot";

export default function FeedPage() {
  const navigate = useNavigate();
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [posts, setPosts] = useState<AssociationPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [associationNames, setAssociationNames] = useState<Record<string, string>>({});
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const hydrateAssociationNames = useCallback(async (items: AssociationPost[]) => {
    const ids = Array.from(new Set(items.map((p) => p.associationId).filter(Boolean)));
    const missing = ids.filter((id) => !associationNames[id]);
    if (missing.length === 0) return;

    const results = await Promise.all(missing.map((id) => getAssociationById(id)));
    const nextMap: Record<string, string> = {};
    results.forEach((a, idx) => {
      const id = missing[idx];
      nextMap[id] = a?.name || "협회";
    });
    setAssociationNames((prev) => ({ ...prev, ...nextMap }));
  }, [associationNames]);

  const loadPosts = useCallback(
    async (reset = false) => {
      if (loading) return;
      if (!reset && !hasMore) return;
      setLoading(true);
      try {
        const res = await listGlobalFeedPosts({
          sortBy: sortMode,
          pageSize: 20,
          afterDoc: reset ? null : lastDoc,
        });
        const nextItems = reset ? res.items : [...posts, ...res.items];
        setPosts(nextItems);
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
        await hydrateAssociationNames(res.items);
      } catch (error) {
        console.error("[FeedPage] 피드 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    },
    [hasMore, hydrateAssociationNames, lastDoc, loading, posts, sortMode]
  );

  useEffect(() => {
    setPosts([]);
    setHasMore(true);
    setLastDoc(null);
    void loadPosts(true);
  }, [sortMode]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          void loadPosts(false);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadPosts, loading]);

  const title = useMemo(() => (sortMode === "latest" ? "전체 피드 · 최신" : "전체 피드 · 인기"), [sortMode]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSortMode("latest")}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                sortMode === "latest"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              최신
            </button>
            <button
              type="button"
              onClick={() => setSortMode("hot")}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                sortMode === "hot"
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              🔥 인기
            </button>
          </div>
        </div>

        {posts.length === 0 && !loading ? (
          <div className="text-sm text-gray-500 border rounded-md p-4 bg-white">피드에 표시할 게시글이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <article
                key={post.id}
                className="border rounded-md p-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/association/${post.associationId}/posts/${post.id}`)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    {associationNames[post.associationId] || "협회"}
                  </span>
                  <h3 className="font-semibold text-gray-900">{post.title}</h3>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-3">
                  <span>❤️ {post.likesCount ?? 0}</span>
                  <span>💬 {post.commentsCount ?? 0}</span>
                  <span>
                    {post.createdAt?.toDate
                      ? post.createdAt.toDate().toLocaleString("ko-KR")
                      : "-"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div ref={loaderRef} className="h-10 flex items-center justify-center text-sm text-gray-500 mt-2">
          {loading ? "불러오는 중..." : hasMore ? "스크롤하면 더 불러옵니다." : "마지막 게시글입니다."}
        </div>
      </div>
    </div>
  );
}

