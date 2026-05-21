/**
 * 🔥 스토리 슬라이더 컴포넌트
 * 
 * 기능:
 * - 좌우 스와이프
 * - 탭 → 다음
 * - 길게 누름 → 일시정지
 * - 자동 슬라이드 (5초)
 */

import { useState, useEffect, useRef } from "react";
import type { Story } from "@/types/story";
import { StoryItem } from "./StoryItem";
import { StoryIndicator } from "./StoryIndicator";
import { Pause } from "lucide-react";

interface StorySliderProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export function StorySlider({ stories, onStoryClick }: StorySliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 슬라이드 (5초마다, 일시정지 시 중지)
  useEffect(() => {
    if (stories.length <= 1 || isPaused) {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
        autoSlideRef.current = null;
      }
      return;
    }

    autoSlideRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stories.length);
    }, 5000);

    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, [stories.length, isPaused]);

  // 길게 누르기 (일시정지)
  const handleLongPressStart = () => {
    longPressRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
    }
    // 짧게 누르면 다음으로
    if (!isPaused) {
      setCurrentIndex((prev) => (prev + 1) % stories.length);
    }
  };

  // 스와이프 핸들러
  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left") {
      setCurrentIndex((prev) => (prev + 1) % stories.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length);
    }
  };

  if (stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  return (
    <div
      className="relative bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg overflow-hidden"
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
    >
      {/* 스토리 아이템 */}
      <StoryItem story={currentStory} isPaused={isPaused} />

      {/* 콘텐츠 영역 */}
      <div className="p-6 text-white">
        <div className="mb-3">
          <h3 className="text-lg font-bold mb-1">{currentStory.title}</h3>
          {currentStory.subtitle && (
            <p className="text-sm text-blue-100">{currentStory.subtitle}</p>
          )}
        </div>

        {/* 인디케이터 */}
        {stories.length > 1 && (
          <div className="mb-4">
            <StoryIndicator
              total={stories.length}
              current={currentIndex}
              onSelect={(index) => setCurrentIndex(index)}
            />
          </div>
        )}

        {/* CTA 버튼 영역 */}
        {currentStory.cta && (
          <button
            onClick={() => onStoryClick(currentStory)}
            className="w-full bg-white text-blue-600 px-4 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            {currentStory.cta.label || "자세히 보기"}
          </button>
        )}
      </div>

      {/* 일시정지 상태 표시 */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
          <div className="flex flex-col items-center gap-2 text-white">
            <Pause className="w-12 h-12" />
            <span className="text-sm">일시정지 중</span>
            <button
              onClick={() => setIsPaused(false)}
              className="mt-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              재생
            </button>
          </div>
        </div>
      )}

      {/* 스와이프 힌트 (모바일) */}
      {stories.length > 1 && (
        <div className="absolute top-4 right-4 flex gap-1 z-10">
          <button
            onClick={() => handleSwipe("right")}
            className="p-2 bg-black/20 rounded-full text-white hover:bg-black/30"
            aria-label="이전"
          >
            ←
          </button>
          <button
            onClick={() => handleSwipe("left")}
            className="p-2 bg-black/20 rounded-full text-white hover:bg-black/30"
            aria-label="다음"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
