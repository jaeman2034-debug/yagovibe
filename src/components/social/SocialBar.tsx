/**
 * 🔥 SocialBar - Social 기능 통합 컴포넌트
 * 
 * 역할:
 * - Like, Comment, Share 버튼 통합
 * - Social Stats 표시
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { LikeButton } from "./LikeButton";
import { CommentButton } from "./CommentButton";
import { ShareButton } from "./ShareButton";
import { getSocialStats } from "@/services/socialService";
import type { SocialEntityType } from "@/types/social";

interface SocialBarProps {
  entityType: SocialEntityType;
  entityId: string;
  showStats?: boolean;
}

export function SocialBar({ entityType, entityId, showStats = true }: SocialBarProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [entityType, entityId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const socialStats = await getSocialStats(entityType, entityId);
      setStats(socialStats);
    } catch (error) {
      console.error("[SocialBar] Stats 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // 로그인하지 않은 사용자는 SocialBar 숨김
  }

  return (
    <div className="flex items-center gap-4 py-3 border-t border-gray-200">
      <LikeButton
        entityType={entityType}
        entityId={entityId}
        onLikeChange={loadStats}
      />
      <CommentButton
        entityType={entityType}
        entityId={entityId}
        onCommentChange={loadStats}
      />
      <ShareButton
        entityType={entityType}
        entityId={entityId}
        onShareChange={loadStats}
      />
      {showStats && !loading && (
        <div className="flex items-center gap-4 ml-auto text-sm text-gray-500">
          {stats.likesCount > 0 && (
            <span className="flex items-center gap-1">
              좋아요 {stats.likesCount}
            </span>
          )}
          {stats.commentsCount > 0 && (
            <span className="flex items-center gap-1">
              댓글 {stats.commentsCount}
            </span>
          )}
          {stats.sharesCount > 0 && (
            <span className="flex items-center gap-1">
              공유 {stats.sharesCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
