/**
 * 🔥 게시글 상세 CTA 영역 (상단 고정)
 * 이미지/가격 아래 바로 배치
 */

import { MessageCircle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketPost } from "../types";

interface PostCTAProps {
  post: MarketPost;
  isOwner: boolean;
  liked: boolean;
  liking: boolean;
  chatting: boolean;
  onChat: () => void | Promise<void>;
  onLike: () => void;
  className?: string;
}

export default function PostCTA({
  post,
  isOwner,
  liked,
  liking,
  chatting,
  onChat,
  onLike,
  className,
}: PostCTAProps) {
  const isDisabled = post.status === "completed" || post.status === "done" || post.status === "hidden";

  return (
    <div className={cn("bg-white border-y border-gray-200 px-4 py-3", className)}>
      <div className="flex gap-3">
        {/* 채팅하기 버튼 (Primary) */}
        {isOwner ? (
          <button
            disabled
            className="flex-1 h-12 rounded-xl bg-gray-200 text-gray-500 text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            본인 상품입니다
          </button>
        ) : (
          <button
            onClick={onChat}
            disabled={isDisabled || chatting}
            className="flex-1 h-12 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            <MessageCircle className="w-5 h-5" />
            {chatting ? "채팅방 준비 중..." : "채팅하기"}
          </button>
        )}

        {/* 찜하기 버튼 (Secondary) */}
        <button
          onClick={onLike}
          disabled={isDisabled || liking || isOwner}
          className={cn(
            "px-4 h-12 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
            liked
              ? "bg-red-100 text-red-600 hover:bg-red-200 border border-red-300"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
          )}
        >
          <Heart className={cn("w-5 h-5", liked && "fill-current")} />
        </button>
      </div>
    </div>
  );
}
