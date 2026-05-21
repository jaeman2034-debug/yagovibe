/**
 * SportEventFeed — 종목 허브 마켓 탭 하단 이벤트 피드
 * activityLogs에서 해당 종목·type=="event"만 조회합니다.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getTimeAgo, toDate } from "@/utils/timeUtils";
import FeedSkeletonGrid from "@/components/sports/FeedSkeletonGrid";
import FeedEmptyState from "@/components/sports/FeedEmptyState";
import { sportHubHref, sportMarketDetailUrl } from "@/utils/sportHubHref";

interface EventPost {
  id: string;
  sport: string;
  type: "EVENT" | "MATCH";
  title: string;
  content?: string;
  authorId: string;
  authorName?: string;
  createdAt: any;
  views?: number;
  participantsCount?: number;
  images?: string[];
}

interface SportEventFeedProps {
  sport: string;
}

export default function SportEventFeed({ sport }: SportEventFeedProps) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(
          collection(db, "activityLogs"),
          where("sport", "==", sport),
          where("type", "==", "event"),
          orderBy("createdAt", "desc"),
          limit(30)
        );

        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            sport: data.sport,
            type: "EVENT" as const,
            title: data.title,
            content: undefined,
            authorId: data.authorId,
            authorName: undefined,
            createdAt: data.createdAt,
            views: 0,
            participantsCount: 0,
            images: data.thumbnail ? [data.thumbnail] : undefined,
            refId: data.refId,
          };
        }) as EventPost[];

        setPosts(postsData);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        const message = String((err as { message?: string })?.message ?? "");
        const indexPending =
          code === "failed-precondition" ||
          message.toLowerCase().includes("index") ||
          message.includes("building");

        if (indexPending) {
          if (import.meta.env.DEV) {
            console.debug("[SportEventFeed] 인덱스 생성·빌드 대기 중:", message);
          }
          setPosts([]);
          setError(null);
        } else {
          console.error("[SportEventFeed] 조회 실패:", err);
          setError("이벤트를 불러오지 못했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, [sport]);

  if (loading) {
    return <FeedSkeletonGrid />;
  }

  if (error) {
    return (
      <FeedEmptyState
        title="이벤트를 불러올 수 없습니다"
        description="잠시 후 다시 시도해주세요."
        ctaText="새로고침"
        onClick={() => window.location.reload()}
      />
    );
  }

  if (posts.length === 0) {
    return (
      <FeedEmptyState
        title="이벤트가 없습니다"
        description="지금은 표시할 이벤트가 없습니다."
        ctaText="이벤트 보기"
        onClick={() => navigate(sportHubHref("event", sport))}
      />
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          onClick={() => {
            const refId = (post as any).refId;
            if (refId) {
              navigate(sportMarketDetailUrl(sport, refId));
            }
          }}
          className="p-4 rounded-lg border-2 border-purple-200 cursor-pointer transition-all hover:shadow-md bg-purple-50"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0" aria-hidden>
              📅
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>

              {post.content && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.content}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{post.authorName || "익명"}</span>
                <span>·</span>
                <span>{getTimeAgo(toDate(post.createdAt))}</span>
                {post.participantsCount !== undefined && (
                  <>
                    <span>·</span>
                    <span>참여 {post.participantsCount}명</span>
                  </>
                )}
              </div>
            </div>

            {post.images && post.images.length > 0 && (
              <div className="flex-shrink-0">
                <img
                  src={post.images[0]}
                  alt={post.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
