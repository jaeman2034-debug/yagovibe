/**
 * 🔥 방문자 액션 컴포넌트
 * 권한 레이어: 비작성자용 액션 (채팅, 찜, 신고)
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, MessageCircle, Flag } from "lucide-react";
import type { MarketPost } from "../types";

interface VisitorActionsProps {
  post: MarketPost;
  userId?: string | null;
  onChat?: () => void | Promise<void>;
  onLike?: (liked: boolean) => void;
  onReport?: () => void;
}

export default function VisitorActions({
  post,
  userId,
  onChat,
  onLike,
  onReport,
}: VisitorActionsProps) {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const [liked, setLiked] = useState(false); // TODO: Firestore에서 찜 상태 로드
  const [liking, setLiking] = useState(false);
  const [chatting, setChatting] = useState(false); // 🔥 채팅방 생성 중 상태
  
  // 🔥 중복 렌더 방지: postId가 없으면 렌더하지 않음
  if (!postId || !post?.id) {
    return null;
  }

  // 🔥 채팅하기 핸들러 (강화 버전)
  const handleChat = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    // 🔥 거래완료/숨김 상태 체크
    if (post.status === "completed" || post.status === "done" || post.status === "hidden") {
      alert("거래가 완료되었거나 삭제된 상품입니다.");
      return;
    }

    // 🔥 본인 상품 체크
    if (userId === post.authorId) {
      alert("본인의 상품에는 채팅할 수 없습니다.");
      return;
    }

    if (chatting) return; // 중복 클릭 방지

    if (onChat) {
      setChatting(true);
      try {
        await onChat();
      } catch (error: any) {
        console.error("❌ [VisitorActions] 채팅 오류:", error);
        // 에러는 onChat 내부에서 처리됨
      } finally {
        setChatting(false);
      }
    } else {
      // Fallback: 직접 채팅방 생성 (onChat이 없는 경우)
      console.warn("⚠️ [VisitorActions] onChat 핸들러가 없습니다. 직접 채팅방 생성 시도:", {
        postId: post.id,
        authorId: post.authorId,
      });
      alert("채팅 기능을 사용할 수 없습니다.");
    }
  };

  // 🔥 찜하기 핸들러
  const handleLike = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (liking) return;

    setLiking(true);
    try {
      const newLiked = !liked;
      setLiked(newLiked);
      
      // 🔥 랭킹 점수 갱신 (marketPosts 컬렉션)
      const { incrementPostLikes, decrementPostLikes } = await import("@/services/marketRankingService");
      if (newLiked) {
        await incrementPostLikes(post.id);
      } else {
        await decrementPostLikes(post.id);
      }
      
      onLike?.(newLiked);
      
      // 🔥 좋아요 클릭 트래킹
      import("@/lib/analytics").then(({ trackMarket }) => {
        trackMarket.toggleLike({
          postId: post.id,
          isLiked: newLiked,
        });
      }).catch((err) => {
        console.warn("⚠️ 트래킹 실패 (무시):", err);
      });
      
      // 🔥 찜하기 알림 생성 (작성자에게)
      if (newLiked && post.authorId && userId && post.authorId !== userId) {
        import("@/services/marketNotificationService").then(({ notifyPostLiked }) => {
          notifyPostLiked({
            authorId: post.authorId,
            postId: post.id,
            postTitle: post.title,
            likerId: userId,
          }).catch((err) => {
            console.warn("⚠️ 찜하기 알림 생성 실패 (무시):", err);
          });
        }).catch((err) => {
          console.warn("⚠️ 알림 서비스 로드 실패 (무시):", err);
        });
      }
      
      console.log("✅ 찜 상태 변경:", { postId: post.id, liked: newLiked });
    } catch (error: any) {
      console.error("❌ 찜 오류:", error);
      setLiked(!liked); // 롤백
      alert("찜하기 중 오류가 발생했습니다.");
    } finally {
      setLiking(false);
    }
  };

  // 🔥 신고하기 핸들러
  const handleReport = () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (onReport) {
      onReport();
    } else {
      // TODO: 신고 모달/페이지로 이동
      console.log("🔥 신고하기:", { postId: post.id });
      alert("신고 기능은 준비 중입니다.");
    }
  };

  // 🔥 거래완료/숨김 상태면 액션 비활성화
  const isDisabled = post.status === "completed" || post.status === "done" || post.status === "hidden";

  // 🔥 Portal로 렌더하여 중복 렌더 방지 및 스크롤 문제 해결
  const chatBarContent = (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg z-40">
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl flex gap-2">
        {/* 채팅하기 버튼 */}
        <button
          onClick={handleChat}
          disabled={isDisabled || chatting}
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          {chatting ? "채팅방 준비 중..." : "채팅하기"}
        </button>

        {/* 찜하기 버튼 */}
        <button
          onClick={handleLike}
          disabled={isDisabled || liking}
          className={`px-4 py-3 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
            liked
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
        </button>

        {/* 신고하기 버튼 */}
        <button
          onClick={handleReport}
          disabled={isDisabled}
          className="px-4 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          title="신고하기"
        >
          <Flag className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // 🔥 document.body에 Portal로 렌더 (중복 렌더 방지)
  return createPortal(chatBarContent, document.body);
}
