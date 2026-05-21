/**
 * 🔥 FollowButton - 팔로우 버튼 컴포넌트
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createFollow,
  deleteFollow,
  checkFollow,
} from "@/services/socialService";
import type { FollowTargetType } from "@/types/social";
import { toast } from "sonner";

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  onFollowChange?: () => void;
}

export function FollowButton({
  targetType,
  targetId,
  onFollowChange,
}: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkFollowStatus();
    }
  }, [user, targetType, targetId]);

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const following = await checkFollow(user.uid, targetType, targetId);
      setIsFollowing(following);
    } catch (error) {
      console.error("[FollowButton] Follow 상태 확인 실패:", error);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        await deleteFollow(user.uid, targetType, targetId);
        setIsFollowing(false);
        toast.success("팔로우를 취소했습니다");
      } else {
        await createFollow(user.uid, targetType, targetId);
        setIsFollowing(true);
        toast.success("팔로우했습니다");
      }
      onFollowChange?.();
    } catch (error: any) {
      console.error("[FollowButton] Follow 토글 실패:", error);
      toast.error(error.message || "팔로우 처리에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleToggleFollow}
      disabled={loading}
      className="flex items-center gap-2"
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          팔로우 중
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          팔로우
        </>
      )}
    </Button>
  );
}
