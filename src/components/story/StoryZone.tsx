/**
 * 🔥 스토리 존 컴포넌트 (최종 완성본)
 * 
 * 정체성: "오늘의 지역 축구 콘텐츠 피드 0.5단계"
 * 
 * 역할:
 * 1. 정보 → 대회/공지
 * 2. 참여 → 팀모집/용병
 * 3. 전환 → 구장/마켓
 * 
 * 기능:
 * - 멀티 스토리 캐러셀 (최대 5개)
 * - 1스토리 = 1행동
 * - 중복 텍스트 제거
 * - 콘텐츠 카드 정체성
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story } from "@/types/story";
import { handleStoryNavigation, getStoryCategory } from "@/lib/story/StoryRouter";
import { mixStories, createFallbackStories } from "@/lib/story/StoryEngine";
// 🔥 CTR 파이프라인: 스토리 로그 전송
import { logStory } from "@/features/sportHub/domain/story.log";
// 🔥 플랫폼 활동 로그 (퍼널 연결)
import { logActivity } from "@/lib/activityLog";

interface StoryZoneProps {
  sportType?: string;
  region?: string;
  autoPlayMs?: number; // 0이면 자동 슬라이드 OFF
  height?: number;
}

// CTA 라우트 매핑 (기존 구조 유지)
const CTA_ROUTES: Record<string, string> = {
  teams: "/teams/search",
  match_today: "/sports/football/team/schedule", // type은 동적으로 주입
  market: "/app/market", // 🔥 퍼널 연결: 올바른 경로로 수정
  venues: "/facilities",
  my_team: "/sports/football/team",
  external: "",
};

// 카테고리 라벨 매핑
const CATEGORY_LABELS: Record<string, string> = {
  협회: "협회 공지",
  모집: "팀 모집",
  대회: "대회 일정",
  마켓: "거래 장터",
  구장: "구장 찾기",
  운영: "운영 소식",
};

// CTA 자동 매핑 (카테고리별 규칙 잠금)
const CTA_MAP: Record<string, string> = {
  대회: "일정 보기",
  모집: "팀 찾기",
  협회: "공지 보기",
  마켓: "보러가기",
  구장: "예약하기",
  운영: "자세히",
};

export function StoryZone({ 
  sportType = "soccer", 
  region,
  autoPlayMs = 0, // 기본 OFF
  height = 220,
}: StoryZoneProps) {
  const navigate = useNavigate();
  const { type } = useParams<{ type?: string }>();
  const currentSportType = type || sportType;
  
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);
  const cacheRef = useRef<{ data: Story[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5분

  // 스토리 데이터 fetch (캐싱 5분)
  useEffect(() => {
    const fetchStories = async () => {
      // 캐시 확인
      if (cacheRef.current) {
        const cacheAge = Date.now() - cacheRef.current.timestamp;
        if (cacheAge < CACHE_DURATION) {
          setStories(cacheRef.current.data);
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        const now = Timestamp.now();

        // 쿼리 구성
        const baseConstraints = [
          where("sport", "==", "soccer"),
          where("status", "==", "published"),
          where("expiresAt", ">", now),
        ];

        // 지역 필터 (선택)
        const regionConstraints = region
          ? [...baseConstraints, where("region", "==", region)]
          : baseConstraints;

        // 1. 운영팀 픽 (ops source, 최신순)
        const opsQuery = query(
          collection(db, "stories"),
          ...regionConstraints,
          where("source", "==", "ops"),
          orderBy("createdAt", "desc"),
          limit(2)
        );

        // 2. 사용자 인기 (좋아요/조회수 기준) - 복합 정렬은 Firestore 인덱스 필요
        // 임시로 createdAt으로 정렬 후 클라이언트에서 필터링
        const popularQuery = query(
          collection(db, "stories"),
          ...regionConstraints,
          where("source", "==", "user"),
          orderBy("createdAt", "desc"),
          limit(10) // 더 많이 가져와서 클라이언트에서 정렬
        );

        // 3. 사용자 최신 (최대 2개)
        const recentQuery = query(
          collection(db, "stories"),
          ...regionConstraints,
          where("source", "==", "user"),
          orderBy("createdAt", "desc"),
          limit(2)
        );

        const [opsSnap, popularSnap, recentSnap] = await Promise.all([
          getDocs(opsQuery).catch(() => ({ docs: [] })),
          getDocs(popularQuery).catch(() => ({ docs: [] })),
          getDocs(recentQuery).catch(() => ({ docs: [] })),
        ]);

        // 데이터 병합 (우선순위: ops > 인기 > 최신)
        const opsStories = opsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Story[];

        // 인기 스토리 (좋아요 기준 정렬)
        const popularStories = popularSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((story) => !opsStories.some((ops) => ops.id === story.id)) // 중복 제거
          .sort((a, b) => (b.stats?.likes || 0) - (a.stats?.likes || 0))
          .slice(0, 2) as Story[];

        const recentStories = recentSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(
            (story) =>
              !opsStories.some((ops) => ops.id === story.id) &&
              !popularStories.some((pop) => pop.id === story.id)
          )
          .slice(0, 2) as Story[];

        // 혼합 D 엔진으로 조합
        const allStories = [...opsStories, ...popularStories, ...recentStories];
        const merged = mixStories(allStories, region);

        // 캐시 저장
        cacheRef.current = {
          data: merged,
          timestamp: Date.now(),
        };

        setStories(merged);
      } catch (error) {
        console.error("스토리 조회 실패:", error);
        // Fallback: 캐시가 있으면 캐시 사용, 없으면 빈 배열
        if (cacheRef.current) {
          setStories(cacheRef.current.data);
        } else {
          setStories([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [sportType, region]);


  // 자동 슬라이드 (옵션)
  useEffect(() => {
    const count = stories.length;
    if (!count || !autoPlayMs || autoPlayMs <= 0) return;

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIdx((v) => (v + 1) % count);
    }, autoPlayMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [stories.length, autoPlayMs]);

  const go = (next: number) => {
    const count = stories.length;
    if (!count) return;
    const normalized = (next + count) % count;
    setIdx(normalized);
  };

  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // 🔥 레거시 Story → 새 버전 Story 타입 변환 헬퍼
  const convertToNewStory = useMemo(() => {
    return (legacyStory: Story): any => {
      const category = getStoryCategory(legacyStory);
      // 카테고리 매핑: 레거시 → 새 버전
      const categoryMap: Record<string, string> = {
        "대회": "대회",
        "모집": "모집",
        "협회": "협회",
        "마켓": "마켓",
        "구장": "구장",
        "운영": "운영",
      };
      const mappedCategory = categoryMap[category] || "운영";
      
      // source 매핑: "ops" | "user" → "운영" | "협회" | "사용자"
      const sourceMap: Record<string, string> = {
        "ops": "운영",
        "user": "사용자",
      };
      const mappedSource = sourceMap[legacyStory.source] || "운영";
      
      return {
        id: legacyStory.id,
        region: legacyStory.region || "seoul",
        category: mappedCategory,
        source: mappedSource,
      };
    };
  }, []);

  // 스토리 클릭 핸들러 (라우팅 분기)
  const handleCta = (story: Story) => {
    const cta = story.cta;
    if (!cta) return;

    // 🔥 CTR 파이프라인: 클릭 로그 전송
    try {
      const newStory = convertToNewStory(story);
      logStory(newStory, "click", {
        mode: "default",
        decisionReason: `CTA 클릭: ${cta.type}`,
        from: "cache", // 레거시는 Firestore 캐시 기반
      });
    } catch (error) {
      console.error("[StoryZone] 로그 전송 실패:", error);
    }

    if (cta.type === "external" && cta.target) {
      window.open(cta.target, "_blank");
      return;
    }

    // 라우트 매핑
    let route = CTA_ROUTES[cta.type] || "/";
    
    // type 파라미터 주입 (필요한 경우)
    if (route.includes(":type") || route.includes("football")) {
      route = route.replace("football", currentSportType);
    }
    
    // 쿼리 파라미터 추가
    const params = new URLSearchParams();
    
    if (cta.type === "teams" || cta.type === "market") {
      params.set("type", currentSportType);
    }
    
    // 🔥 퍼널 연결: 스토리에서 온 경우 source 파라미터 추가
    if (cta.type === "market") {
      params.set("source", "story");
      // 🔥 퍼널 연결: 마켓 이동 로그
      logActivity({
        event: "MARKET_VIEW",
        location: "/app/market",
        meta: { 
          source: "story",
          storyId: story.id,
          category: story.category || "unknown",
          viewMode: "list",
        },
      });
    }
    
    if (cta.target) {
      route = `${route}${cta.target}`;
    }
    
    // 쿼리 파라미터가 있으면 추가
    const queryString = params.toString();
    if (queryString) {
      route = `${route}?${queryString}`;
    }
    
    navigate(route);
  };

  // 기본 스토리 (데이터 없을 때 - StoryEngine 폴백 사용)
  const defaultStories: Story[] = createFallbackStories();
  
  // 기존 하드코딩된 기본 스토리 (하위 호환성 유지)
  const legacyDefaultStories: Story[] = [
    {
      id: "default-1",
      sport: "soccer",
      source: "ops",
      type: "image",
      mediaUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%230d9f6e' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial, sans-serif' font-size='72' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E🏆%3C/text%3E%3C/svg%3E",
      title: "이번 주 대회 일정",
      subtitle: "지역 리그 경기 시간표를 확인하세요",
      cta: {
        type: "match_today",
        label: "일정 보기",
      },
      stats: { views: 0, likes: 0 },
      status: "published",
      expiresAt: Date.now() / 1000 + 86400 * 7,
      createdAt: Date.now() / 1000,
      createdBy: "system",
    },
    {
      id: "default-2",
      sport: "soccer",
      source: "ops",
      type: "image",
      mediaUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%230d9f6e' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial, sans-serif' font-size='72' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E👥%3C/text%3E%3C/svg%3E",
      title: "우리 동네 팀 모집",
      subtitle: "주 1회 / 초보 환영",
      cta: {
        type: "teams",
        label: "팀 찾기",
      },
      stats: { views: 0, likes: 0 },
      status: "published",
      expiresAt: Date.now() / 1000 + 86400 * 7,
      createdAt: Date.now() / 1000,
      createdBy: "system",
    },
    {
      id: "default-3",
      sport: "soccer",
      source: "ops",
      type: "image",
      mediaUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%230d9f6e' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial, sans-serif' font-size='72' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E🛒%3C/text%3E%3C/svg%3E",
      title: "축구화 중고 특가",
      subtitle: "오늘 등록 24건",
      cta: {
        type: "market",
        label: "보러가기",
      },
      stats: { views: 0, likes: 0 },
      status: "published",
      expiresAt: Date.now() / 1000 + 86400 * 7,
      createdAt: Date.now() / 1000,
      createdBy: "system",
    },
  ];

  const displayStories = stories.length > 0 ? stories : defaultStories;
  const current = useMemo(() => displayStories[idx] || displayStories[0], [displayStories, idx]);
  const count = displayStories.length;

  // 🔥 CTR 파이프라인: 노출(impression) 로그 전송
  useEffect(() => {
    if (!current) return;
    
    try {
      const newStory = convertToNewStory(current);
      logStory(newStory, "impression", {
        mode: "default",
        decisionReason: `스토리 노출: ${current.title}`,
        from: "cache", // 레거시는 Firestore 캐시 기반
      });
    } catch (error) {
      console.error("[StoryZone] 노출 로그 전송 실패:", error);
    }
  }, [current?.id]); // current.id가 변경될 때마다 노출 로그 전송

  // 카테고리 추출 (StoryRouter 사용)
  const getCategory = (story: Story): string => {
    return getStoryCategory(story);
  };

  // CTA 라벨 자동 설정 (카테고리별 - 규칙 잠금)
  const getCtaLabel = (story: Story): string => {
    const category = getCategory(story);
    return CTA_MAP[category] || "자세히";
  };

  // 로딩 상태
  if (loading) {
    return (
      <section className="p-3 px-4">
        <div className="relative w-full h-[200px] rounded-2xl overflow-hidden bg-[#0d9f6e] flex items-center justify-center">
          <div className="animate-pulse text-white">로딩 중...</div>
        </div>
      </section>
    );
  }

  if (!count) return null;

  const category = getCategory(current);

  return (
    <section className="px-4 py-3">
      {/* 상단 맥락 라벨 */}
      <div className="text-[13px] mb-2 text-teal-700 font-semibold">
        지역 축구 / {CATEGORY_LABELS[category] || category}
      </div>

      {/* 스토리 카드 */}
      <div className="relative h-[200px] rounded-2xl bg-emerald-600 text-white p-4 overflow-hidden">
        {/* 배경 이미지/영상 (있는 경우) */}
        {current.mediaUrl && current.type === "image" && (
          <img
            src={current.mediaUrl}
            alt={current.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23059669' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial, sans-serif' font-size='48' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E⚽%3C/text%3E%3C/svg%3E";
            }}
          />
        )}
        {current.mediaUrl && current.type === "video" && (
          <video
            src={current.mediaUrl}
            poster={current.posterUrl}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* 콘텐츠 */}
        <div className="relative h-full flex flex-col justify-between">
          <div className="max-w-[78%]">
            <h2 className="text-[18px] font-bold mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="text-[13px] opacity-90 whitespace-nowrap overflow-hidden text-ellipsis">
                {current.subtitle}
              </p>
            )}
          </div>

          {/* CTA 버튼 */}
          {current.cta && (
            <button
              onClick={() => handleCta(current)}
              className="absolute right-4 bottom-4 bg-white text-emerald-700 px-3 py-2 rounded-full text-[13px] font-medium hover:bg-white/90 transition-colors"
            >
              {getCtaLabel(current)}
            </button>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        {count > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="이전"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/35 transition-colors z-10"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="다음"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/35 transition-colors z-10"
            >
              ›
            </button>
          </>
        )}

        {/* 인디케이터 */}
        {count > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-[3px]">
            {displayStories.map((_, i) => (
              <button
                key={displayStories[i].id}
                onClick={() => go(i)}
                aria-label={`스토리 ${i + 1}`}
                className={`w-[5px] h-[5px] rounded-full transition-all ${
                  i === idx ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
