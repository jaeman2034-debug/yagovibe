/**
 * 🔥 스토리 아이템 컴포넌트
 * 
 * 기능:
 * - 이미지/영상 표시
 * - 영상 자동 재생/정지
 * - 네트워크 실패 → 기본 이미지
 */

import { useState } from "react";
import type { Story } from "@/types/story";
import { Pause } from "lucide-react";

interface StoryItemProps {
  story: Story;
  isPaused?: boolean;
}

export function StoryItem({ story, isPaused = false }: StoryItemProps) {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // 기본 이미지 (fallback)
  const defaultImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E이미지를 불러올 수 없습니다%3C/text%3E%3C/svg%3E";

  if (story.type === "video") {
    return (
      <div className="relative h-48 bg-blue-700/50">
        {videoError ? (
          <img
            src={story.posterUrl || defaultImage}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={story.mediaUrl}
            poster={story.posterUrl}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoError(true)}
          />
        )}
        {isPaused && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Pause className="w-12 h-12 text-white" />
          </div>
        )}
      </div>
    );
  }

  // 이미지 타입
  return (
    <div className="relative h-48 bg-blue-700/50">
      {imageError ? (
        <img
          src={defaultImage}
          alt={story.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={story.mediaUrl}
          alt={story.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
}
