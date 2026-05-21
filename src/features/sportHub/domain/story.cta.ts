/**
 * 🔥 Story CTA - 규칙 하드락
 */

import { StoryCategory, StoryCtaType } from "./story.types";

export const CTA_LABEL_BY_TYPE: Record<StoryCtaType, string> = {
  view_schedule: "일정 보기",
  find_team: "팀 찾기",
  view_notice: "공지 보기",
  browse_market: "보러가기",
  book_ground: "예약하기",
};

export const CTA_TYPE_BY_CATEGORY: Record<StoryCategory, StoryCtaType> = {
  대회: "view_schedule",
  모집: "find_team",
  협회: "view_notice",
  마켓: "browse_market",
  구장: "book_ground",
};

export const getCtaType = (category: StoryCategory, ctaType?: StoryCtaType) =>
  ctaType ?? CTA_TYPE_BY_CATEGORY[category];

export const getCtaLabel = (category: StoryCategory, ctaType?: StoryCtaType) =>
  CTA_LABEL_BY_TYPE[getCtaType(category, ctaType)];
