/**
 * 🔥 ActivityPostDetailPage - activityPosts 상세 페이지
 * 
 * 역할:
 * - activityPosts 컬렉션의 단일 문서 조회 및 표시
 * - 조회수 증가 (transaction)
 * - TEAM/EVENT/MATCH/TRADE_ACTIVITY 모든 타입 지원
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, runTransaction, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getTimeAgo, toDate } from "@/utils/timeUtils";
import { getSportIcon, getSportLabel } from "@/constants/sports";

interface ActivityPost {
  id: string;
  sport: string;
  type: "TEAM" | "EVENT" | "MATCH" | "TRADE_ACTIVITY";
  title: string;
  content?: string;
  authorId: string;
  authorName?: string;
  createdAt: any;
  updatedAt?: any;
  views?: number;
  likeCount?: number;
  commentCount?: number;
  participantsCount?: number;
  status?: "OPEN" | "CLOSED";
  location?: { lat: number; lng: number; name?: string };
  images?: string[];
}

export default function ActivityPostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<ActivityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setError("게시글 ID가 없습니다.");
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const ref = doc(db, "activityPosts", postId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("게시글을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        const data = snap.data();
        setPost({
          id: snap.id,
          ...data,
        } as ActivityPost);
        setLoading(false);

        // 🔥 조회수 증가 (transaction)
        runTransaction(db, async (tx) => {
          const postSnap = await tx.get(ref);
          if (!postSnap.exists()) return;
          tx.update(ref, { views: increment(1) });
        }).catch((err) => {
          console.warn("⚠️ 조회수 증가 실패:", err);
        });
      } catch (err: any) {
        console.error("❌ [ActivityPostDetailPage] 게시글 로드 실패:", err);
        setError(err?.message || "게시글을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    void fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600 mb-4">{error || "게시글을 찾을 수 없습니다."}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  const typeLabel =
    post.type === "TEAM" ? "팀" :
    post.type === "EVENT" ? "이벤트" :
    post.type === "MATCH" ? "매칭" :
    post.type === "TRADE_ACTIVITY" ? "거래" :
    "활동";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 mb-2"
        >
          ← 뒤로
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getSportIcon(post.sport as any)}</span>
          <h1 className="text-lg font-semibold text-gray-900">
            {getSportLabel(post.sport as any)} {typeLabel}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* 제목 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{post.authorName || "익명"}</span>
            <span>•</span>
            <span>{getTimeAgo(toDate(post.createdAt))}</span>
            {post.views !== undefined && (
              <>
                <span>•</span>
                <span>조회 {post.views}</span>
              </>
            )}
          </div>
        </div>

        {/* 이미지 */}
        {post.images && post.images.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              {post.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`이미지 ${idx + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* 내용 */}
        {post.content && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
          </div>
        )}

        {/* 상태 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">상태</span>
              <p className="font-medium text-gray-900">
                {post.status === "OPEN" ? "진행중" : "마감"}
              </p>
            </div>
            {post.participantsCount !== undefined && (
              <div>
                <span className="text-gray-500">참여자</span>
                <p className="font-medium text-gray-900">{post.participantsCount}명</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
