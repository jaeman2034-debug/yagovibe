/**
 * 🔥 Story Router - react-router 기준 라우팅 잠금
 */

import { Story, StoryCtaType } from "./story.types";
import { getCtaType } from "./story.cta";

// CTA 타입 → 실제 라우트 매핑 (프로젝트 실제 경로)
export const ROUTE_BY_CTA: Record<StoryCtaType, (sportType?: string) => string> = {
  view_schedule: (sportType = "football") => `/sports/${sportType}/team/schedule`,
  find_team: (sportType = "football") => `/teams/search?type=${sportType}`,
  view_notice: () => `/notifications`,
  browse_market: (sportType = "football") => `/market?type=${sportType}`,
  book_ground: (sportType = "football") => `/ground?type=${sportType}`, // 구장 예약 페이지
};

export const getStoryRoute = (story: Story, sportType: string = "football") => {
  const ctaType = getCtaType(story.category, story.ctaType);
  return ROUTE_BY_CTA[ctaType](sportType);
};
