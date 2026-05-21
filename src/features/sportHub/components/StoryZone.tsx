/**
 * 🔥 StoryZone - 모바일 퍼스트 최적화
 * 
 * 모바일 퍼스트 원칙:
 * - 엄지존 기준 레이아웃
 * - 터치 안전 규격 (44×44px)
 * - 스와이프 우선
 * - 성능 최적화 (LCP < 2.5s, 리플로우 0)
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCtaLabel } from "../domain/story.cta";
import { getStoryRoute } from "../domain/story.router";
import { useStoriesForZone } from "../hooks/useStoriesForZone";
import { logStory } from "../domain/story.log";
import { logExperiment } from "../domain/experiment.log";
import { useStoryZoneVariant } from "../hooks/useStoryZoneVariant";
import SmartImage from "./SmartImage";

// 카테고리 라벨 매핑
const CATEGORY_LABELS: Record<string, string> = {
  협회: "협회 공지",
  모집: "팀 모집",
  대회: "대회 일정",
  마켓: "거래 장터",
  구장: "구장 찾기",
  운영: "운영 소식",
};

export default function StoryZone() {
  const navigate = useNavigate();
  const { stories, mode, decisionReason, from, loading } = useStoriesForZone();
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const isSwiping = useRef(false);

  // AB 테스트 할당
  const exp = useStoryZoneVariant(null); // TODO: userId 있으면 넣기

  const story = stories[index] ?? stories[0];
  const ctx = { mode, decisionReason, from };

  // ✅ 1. 노출 로그 (스토리 변경 시) + AB 실험 로그
  useEffect(() => {
    if (story) {
      // 기존 스토리 로그
      logStory(story, "impression", ctx);

      // AB 실험 로그 (mode/decisionReason 포함)
      logExperiment({
        event: "exp_impression",
        experimentKey: exp.key,
        variant: exp.variant,
        at: new Date().toISOString(),
        surface: "StoryZone",
        meta: {
          storyId: story.id,
          category: story.category,
          source: story.source,
          mode,
          decisionReason,
        },
      });
    }
    // story.id 바뀔 때만 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const prev = () => setIndex((i) => (i === 0 ? stories.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === stories.length - 1 ? 0 : i + 1));

  // 스와이프 제스처 (16px 이상 이동 시 전환)
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const diff = Math.abs(e.touches[0].clientX - startX.current);
    if (diff > 8) {
      isSwiping.current = true;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;

    const diff = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(diff) > 16) {
      // 16px 이상 이동 시 전환
      if (diff > 0) {
        prev();
      } else {
        next();
      }
    }
    isSwiping.current = false;
  };

  const onCta = () => {
    if (!story) return;

    // ✅ 2. 클릭 로그 + AB 실험 로그
    logStory(story, "click", ctx);
    logExperiment({
      event: "exp_click",
      experimentKey: exp.key,
      variant: exp.variant,
      at: new Date().toISOString(),
      surface: "StoryZone",
      meta: {
        storyId: story.id,
        category: story.category,
        source: story.source,
        mode,
        decisionReason,
      },
    });

    const path = getStoryRoute(story);

    // ✅ 3. 라우팅 로그
    logStory(story, "route", ctx);

    navigate(path);
  };

  // AB variant에 따른 CTA 스타일
  const ctaClass =
    exp.variant === "A"
      ? "h-[44px] min-w-[96px] text-[14px]" // 기본
      : "h-[48px] min-w-[108px] text-[15px] font-semibold"; // B: 더 크고 강함

  // 로딩 상태
  if (loading) {
    return (
      <section className="px-4 py-3">
        <div className="relative h-[192px] rounded-2xl bg-emerald-600 text-white p-4 flex items-center justify-center">
          <div className="animate-pulse">로딩 중...</div>
        </div>
      </section>
    );
  }

  if (!story) return null;

  const categoryLabel = CATEGORY_LABELS[story.category] || story.category;

  const ctaLabel = getCtaLabel(story.category, story.ctaType);

  return (
    <section
      className="px-4 py-3"
      aria-label="오늘의 축구 소식"
    >
      {/* 상단 라벨: 12px */}
      <div className="text-[12px] mb-2 text-teal-700 font-semibold">
        지역 축구 / {categoryLabel}
      </div>

      {/* 스토리 카드: 높이 192px 고정, 스와이프 지원, 접근성 */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`스토리 ${index + 1} / ${stories.length}`}
        className="relative h-[192px] rounded-2xl bg-emerald-600 text-white p-4 touch-none select-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* 배경 이미지 - SmartImage 사용 (3단계 로딩) */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <SmartImage
            src={story.imageUrl}
            alt={story.title}
            className="w-full h-full"
            aspectRatio="16/9"
          />
        </div>

        {/* 텍스트 영역: 78% 제한, 1줄 위계 */}
        <div className="relative max-w-[78%] z-10">
          <h2 className="text-[18px] font-bold mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {story.title}
          </h2>
          <p className="text-[13px] opacity-90 whitespace-nowrap overflow-hidden text-ellipsis">
            {story.subtitle}
          </p>
        </div>

        {/* CTA 버튼: AB variant에 따라 스타일 변경 */}
        <button
          onClick={onCta}
          aria-label={`${story.title} ${ctaLabel}`}
          className={`absolute right-4 bottom-4 bg-white text-emerald-700 px-3 rounded-full font-medium active:scale-[0.98] transition-transform touch-manipulation z-10 focus-visible:outline-2 focus-visible:outline-emerald-700 focus-visible:outline-offset-2 ${ctaClass}`}
        >
          {ctaLabel}
        </button>

        {/* 네비게이션 버튼 (스와이프 대체, 선택적) */}
        {stories.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white active:bg-black/40 transition-colors touch-manipulation z-10 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              aria-label="이전 스토리"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white active:bg-black/40 transition-colors touch-manipulation z-10 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              aria-label="다음 스토리"
            >
              ›
            </button>
          </>
        )}

        {/* 인디케이터: 5px, 간격 3px */}
        {stories.length > 1 && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-[3px] z-10"
            role="tablist"
            aria-label="스토리 인디케이터"
          >
            {stories.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                role="tab"
                aria-selected={i === index}
                aria-label={`스토리 ${i + 1}로 이동`}
                className={`w-[5px] h-[5px] rounded-full transition-all touch-manipulation focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-1 ${
                  i === index ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
