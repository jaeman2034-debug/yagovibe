/**
 * 🔥 LikeButton - 좋아요 버튼 컴포넌트
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createLike,
  deleteLike,
  checkLike,
} from "@/services/socialService";
import type { SocialEntityType } from "@/types/social";
import { toast } from "sonner";

interface LikeButtonProps {
  entityType: SocialEntityType;
  entityId: string;
  onLikeChange?: () => void;
}

export function LikeButton({
  entityType,
  entityId,
  onLikeChange,
}: LikeButtonProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkLikeStatus();
    }
  }, [user, entityType, entityId]);

  const checkLikeStatus = async () => {
    if (!user) return;

    try {
      const liked = await checkLike(user.uid, entityType, entityId);
      setIsLiked(liked);
    } catch (error) {
      console.error("[LikeButton] Like 상태 확인 실패:", error);
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        await deleteLike(user.uid, entityType, entityId);
        setIsLiked(false);
        toast.success("좋아요를 취소했습니다");
      } else {
        await createLike(user.uid, entityType, entityId);
        setIsLiked(true);
        toast.success("좋아요를 눌렀습니다");
      }
      onLikeChange?.();
    } catch (error: any) {
      console.error("[LikeButton] Like 토글 실패:", error);
      toast.error(error.message || "좋아요 처리에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleLike}
      disabled={loading}
      className="flex items-center gap-2"
    >
      <Heart
        className={`w-5 h-5 transition-colors ${
          isLiked
            ? "fill-red-500 text-red-500"
            : "text-gray-400 hover:text-red-500"
        }`}
      />
      <span className={isLiked ? "text-red-500 font-medium" : "text-gray-600"}>
        좋아요
      </span>
    </Button>
  );
}
