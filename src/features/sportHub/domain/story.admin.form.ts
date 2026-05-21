/**
 * 🔥 Story Admin Form - 운영 친화 모델
 */

import type { StoryCategory, StorySource, StoryStatus } from "./story.types";

export type AdminStoryForm = {
  title: string;       // ≤40
  subtitle: string;    // ≤60

  category: StoryCategory;
  source: StorySource;

  startAt: string;     // ISO string (기본 now)
  endAt: string;       // ISO string (기본 +7일)

  priority: number;    // 0~100
  score: number;       // 사용자만
  isVerifiedAuthor: boolean;

  status: StoryStatus;
  
  // 선택 필드
  ctaType?: string;
  imageUrl?: string;
  metadata?: {
    [key: string]: any;
  };
};

/**
 * 기본 폼 생성
 */
export function defaultStoryForm(): AdminStoryForm {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    title: "",
    subtitle: "",
    category: "대회",
    source: "운영",

    startAt: now.toISOString(),
    endAt: week.toISOString(),

    priority: 80,
    score: 0,
    isVerifiedAuthor: false,

    status: "PUBLISHED",
  };
}

/**
 * 폼 검증
 */
export function validateAdminForm(form: Partial<AdminStoryForm>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!form.title || form.title.trim().length === 0) {
    errors.push("제목은 필수입니다");
  } else if (form.title.length > 40) {
    errors.push("제목은 40자 이하여야 합니다");
  }

  if (!form.subtitle || form.subtitle.trim().length === 0) {
    errors.push("부제목은 필수입니다");
  } else if (form.subtitle.length > 60) {
    errors.push("부제목은 60자 이하여야 합니다");
  }

  if (form.startAt && form.endAt) {
    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    if (end <= start) {
      errors.push("종료일은 시작일보다 늦어야 합니다");
    }
  }

  if (form.priority !== undefined) {
    if (form.priority < 0 || form.priority > 100) {
      errors.push("우선순위는 0-100 사이여야 합니다");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
