/**
 * 🔥 Story Admin Defaults - 기본값 자동 주입
 * 
 * 운영 리소스 절약을 위한 기본값 자동 적용
 */

import type { StoryAdminForm } from "./story.admin.types";
import { DEFAULT_EXPIRATION_DAYS } from "./story.expiration.policy";

/**
 * 기본 스케줄 적용
 * 
 * - startAt: "지금" (지정 안 하면)
 * - endAt: "+7일" (지정 안 하면)
 */
export function applyDefaultSchedule(
  input: Partial<StoryAdminForm>
): StoryAdminForm {
  const now = new Date();
  
  // startAt 기본값: 지금
  const start = input.startAt 
    ? new Date(input.startAt) 
    : now;

  // endAt 기본값: startAt + 7일
  const end = input.endAt
    ? new Date(input.endAt)
    : new Date(start.getTime() + DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

  return {
    ...input,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  } as StoryAdminForm;
}

/**
 * Admin 폼 기본값 전체 적용
 */
export function applyAdminDefaults(
  input: Partial<StoryAdminForm>,
  role: "admin" | "association" | "user"
): StoryAdminForm {
  // 스케줄 기본값
  const withSchedule = applyDefaultSchedule(input);

  // 상태 기본값
  const defaultStatus = role === "user" ? "DRAFT" : "PUBLISHED";

  // 우선순위 기본값 (source별)
  const defaultPriority = 
    role === "admin" ? 90 :
    role === "association" ? 85 :
    0;

  return {
    ...withSchedule,
    status: (input as any).status || defaultStatus,
    priority: input.priority ?? defaultPriority,
  } as StoryAdminForm;
}
