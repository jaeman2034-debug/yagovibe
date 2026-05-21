/**
 * 🔥 Story Router - 카테고리 → 라우트 매핑 + 로그 이벤트
 * 
 * 역할:
 * - CTA 타입별 라우트 자동 매핑
 * - 클릭 이벤트 로깅
 * - 예외 처리 및 폴백
 */

import type { Story, StoryCTA } from "@/types/story";

// 카테고리 → 라우트 매핑 테이블
export const ROUTE_MAP: Record<string, string> = {
  대회: "/sports/football/team/schedule",
  모집: "/teams/search",
  협회: "/notifications", // 공지 페이지로 임시 매핑
  마켓: "/market",
  구장: "/facilities",
  운영: "/sports/football",
};

// CTA 타입 → 라우트 매핑
export const CTA_ROUTE_MAP: Record<StoryCTA, string> = {
  teams: "/teams/search",
  match_today: "/sports/football/team/schedule",
  market: "/market",
  venues: "/facilities",
  my_team: "/sports/football/team",
  external: "",
};

/**
 * 스토리 카테고리 추출
 */
export function getStoryCategory(story: Story): string {
  const ctaType = story.cta?.type;
  
  if (ctaType === "match_today") return "대회";
  if (ctaType === "teams") return "모집";
  if (ctaType === "market") return "마켓";
  if (ctaType === "venues") return "구장";
  if (story.source === "ops") return "협회";
  
  return "운영";
}

/**
 * 스토리 라우트 생성
 * 
 * @param story - 스토리 객체
 * @param sportType - 현재 스포츠 타입 (기본: "football")
 * @returns 라우트 경로
 */
export function getStoryRoute(
  story: Story,
  sportType: string = "football"
): string {
  // 외부 링크 처리
  if (story.cta?.type === "external" && story.cta.target) {
    return story.cta.target;
  }

  // CTA 타입 기반 라우트
  const baseRoute = CTA_ROUTE_MAP[story.cta?.type || "teams"] || "/";
  
  // 스포츠 타입 주입
  let route = baseRoute;
  if (route.includes("football")) {
    route = route.replace("football", sportType);
  }

  // 쿼리 파라미터 추가
  const params: string[] = [];
  
  if (story.region) {
    params.push(`region=${story.region}`);
  }
  
  if (story.cta?.type === "teams" || story.cta?.type === "market") {
    params.push(`type=${sportType}`);
  }

  // 타겟 추가 (예: 특정 팀 ID)
  if (story.cta?.target) {
    const target = story.cta.target.startsWith("/") 
      ? story.cta.target 
      : `/${story.cta.target}`;
    route = route.endsWith("/") 
      ? `${route}${target.slice(1)}` 
      : `${route}${target}`;
  }

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  
  return `${route}${queryString}`;
}

/**
 * 스토리 클릭 이벤트 로깅
 */
export function logStoryClick(story: Story, route: string): void {
  try {
    // Analytics 이벤트 (필요시 구현)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "story_click", {
        story_id: story.id,
        story_category: getStoryCategory(story),
        story_source: story.source,
        cta_type: story.cta?.type,
        route: route,
      });
    }

    // 콘솔 로그 (개발 환경)
    if (process.env.NODE_ENV === "development") {
      console.log("[StoryRouter] 클릭 이벤트:", {
        storyId: story.id,
        category: getStoryCategory(story),
        route,
      });
    }
  } catch (error) {
    console.error("[StoryRouter] 로그 이벤트 실패:", error);
  }
}

/**
 * 스토리 네비게이션 핸들러
 * 
 * @param story - 스토리 객체
 * @param navigate - react-router navigate 함수
 * @param sportType - 현재 스포츠 타입
 */
export function handleStoryNavigation(
  story: Story,
  navigate: (path: string) => void,
  sportType: string = "football"
): void {
  try {
    const route = getStoryRoute(story, sportType);
    
    // 외부 링크 처리
    if (story.cta?.type === "external" && story.cta.target) {
      window.open(route, "_blank", "noopener,noreferrer");
      logStoryClick(story, route);
      return;
    }

    // 내부 라우팅
    navigate(route);
    logStoryClick(story, route);
  } catch (error) {
    console.error("[StoryRouter] 네비게이션 실패:", error);
    
    // 폴백: 홈으로 이동
    navigate("/sports-hub");
  }
}
