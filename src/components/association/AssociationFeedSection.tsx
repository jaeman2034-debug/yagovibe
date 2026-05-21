import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAssociationPosts, toggleAssociationPostPinned, type AssociationPost, type AssociationPostType } from "@/services/associationPostService";
import { getUserRole, isAdmin, type AssociationWithMembers } from "@/utils/permissions";
import { useAuth } from "@/context/AuthProvider";
import { calcScore } from "@/utils/calcScore";

const tabs: Array<{ key: AssociationPostType; label: string }> = [
  { key: "notice", label: "공지" },
  { key: "schedule", label: "일정" },
  { key: "recruit", label: "모집" },
  { key: "free", label: "자유" },
];

interface Props {
  associationId: string;
  association: AssociationWithMembers | null;
}

export default function AssociationFeedSection({ associationId, association }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<AssociationPostType>("notice");
  const [sortMode, setSortMode] = useState<"latest" | "hot">("latest");
  const [posts, setPosts] = useState<AssociationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinningId, setPinningId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const items = await listAssociationPosts(associationId, tab, sortMode);
        setPosts(items);
      } catch (error) {
        console.error("[AssociationFeedSection] 게시글 조회 실패:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [associationId, tab, sortMode]);

  const role = getUserRole(association, user?.uid);
  const canWriteGeneral = !!role;
  const canWriteNotice = isAdmin(association, user?.uid);
  const canWriteCurrentTab = tab === "notice" ? canWriteNotice : canWriteGeneral;

  const tabLabel = useMemo(() => tabs.find((t) => t.key === tab)?.label ?? "게시판", [tab]);

  const handleTogglePin = async (post: AssociationPost) => {
    if (!canWriteNotice || tab !== "notice" || pinningId) return;
    setPinningId(post.id);
    try {
      await toggleAssociationPostPinned(post.id, !post.isPinned);
      const items = await listAssociationPosts(associationId, tab, sortMode);
      setPosts(items);
    } catch (error) {
      console.error("[AssociationFeedSection] 공지 고정 토글 실패:", error);
      alert("공지 고정 변경에 실패했습니다.");
    } finally {
      setPinningId(null);
    }
  };

  return (
    <section id="association-feed" className="py-10 border-b bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-900">협회 게시판</h2>
          {canWriteCurrentTab && (
            <button
              type="button"
              onClick={() => navigate(`/association/${associationId}/posts/create?type=${tab}`)}
              className="px-3 py-2 rounded-md border border-blue-200 text-blue-700 bg-blue-50 text-sm font-medium"
            >
              {tabLabel} 글쓰기
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                tab === item.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSortMode("latest")}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              sortMode === "latest"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
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
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            🔥 인기
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 py-6">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 border rounded-md px-4">등록된 글이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <article
                key={post.id}
                className={`border rounded-md p-3 cursor-pointer transition-colors ${
                  post.type === "notice"
                    ? "bg-amber-50 hover:bg-amber-100 border-l-4 border-l-amber-400"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => navigate(`/association/${associationId}/posts/${post.id}`)}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                  {post.isPinned && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">📌 공지</span>
                  )}
                  <h3 className="font-semibold text-gray-900">{post.title}</h3>
                  </div>
                  {tab === "notice" && canWriteNotice && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleTogglePin(post);
                      }}
                      disabled={pinningId === post.id}
                      className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-700 bg-white hover:bg-amber-50 disabled:opacity-50"
                    >
                      {pinningId === post.id
                        ? "처리 중..."
                        : post.isPinned
                          ? "고정 해제"
                          : "상단 고정"}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-3">
                  <span>작성자: {post.uid}</span>
                  <span>💬 {post.commentsCount ?? 0}</span>
                  <span>❤️ {post.likesCount ?? 0}</span>
                  {sortMode === "hot" && (
                    <span>점수 {calcScore(post).toFixed(1)}</span>
                  )}
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
      </div>
    </section>
  );
}

