/**
 * 🔥 Onboarding Content - Day0 콘텐츠 세트
 * 
 * 콘텐츠 공백 없이 시작
 */

import type { OnboardingContentSet } from "./onboarding.types";
import type { Region } from "./region.types";
import { REGION_LABELS } from "./region.types";

/**
 * Day0 기본 콘텐츠 세트
 */
export const DEFAULT_ONBOARDING_CONTENT: OnboardingContentSet = {
  stories: {
    assocLeague: 2,  // 협회 대회 2개
    opsPick: 2,       // 운영 픽 2개
    user: 1,          // 사용자 1개
  },
  grounds: 3,         // 추천 구장 3곳
  teams: 2,           // 팀 모집 2건
  market: 5,          // 마켓 기본 5개
};

/**
 * 웰컴 메시지 생성
 */
export function generateWelcomeMessage(
  region: Region,
  step: "welcome" | "engage" | "settle",
  hasReservation?: boolean
): {
  title: string;
  subtitle: string;
  cta: string;
} {
  const regionName = REGION_LABELS[region];

  switch (step) {
    case "welcome":
      return {
        title: `${regionName} 축구 시작하기`,
        subtitle: "이번 주 우리 동네 대회를 확인해보세요",
        cta: "스토리 보기",
      };
    case "engage":
      if (hasReservation) {
        return {
          title: "첫 예약 완료!",
          subtitle: "이제 팀을 찾아보세요",
          cta: "팀 찾기",
        };
      }
      return {
        title: "가까운 구장 3곳",
        subtitle: "첫 예약 시 10% 할인",
        cta: "구장 보기",
      };
    case "settle":
      return {
        title: "리그 일정 구독하기",
        subtitle: "우리 동네 경기 일정을 놓치지 마세요",
        cta: "구독하기",
      };
    default:
      return {
        title: `${regionName}에서 시작하기`,
        subtitle: "지역 축구 커뮤니티에 오신 것을 환영합니다",
        cta: "시작하기",
      };
  }
}

/**
 * 첫 세션 메시지
 */
export function getFirstSessionMessage(region: Region): {
  title: string;
  subtitle: string;
  highlight?: string;
} {
  const regionName = REGION_LABELS[region];
  
  return {
    title: `${regionName} 축구 허브`,
    subtitle: "우리 동네 축구 소식을 한눈에",
    highlight: "첫 예약 10% 할인",
  };
}

/**
 * 2회차 세션 메시지
 */
export function getSecondSessionMessage(region: Region): {
  title: string;
  subtitle: string;
  cta: string;
} {
  return {
    title: "팀 찾기",
    subtitle: "우리 동네 팀에 합류해보세요",
    cta: "팀 찾기",
  };
}
