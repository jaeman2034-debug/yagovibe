/**
 * 🔥 Validators - 가드 고정
 * 
 * Week1~2 API Stub 기준
 */

import type { CreateStoryReq } from "./types";

export function validateStoryInput(input: CreateStoryReq): void {
  if (!input.title?.trim()) {
    throw new Error("title required");
  }
  if (!input.subtitle?.trim()) {
    throw new Error("subtitle required");
  }
  if (input.title.length > 40) {
    throw new Error("title too long (max 40)");
  }
  if (input.subtitle.length > 60) {
    throw new Error("subtitle too long (max 60)");
  }
  if (!input.region) {
    throw new Error("region required");
  }
  if (!input.category) {
    throw new Error("category required");
  }
  if (!input.source) {
    throw new Error("source required");
  }
}

export function applyDefaultSchedule(input: CreateStoryReq): CreateStoryReq & {
  startAt: string;
  endAt: string;
} {
  const now = new Date();
  const start = input.startAt ? new Date(input.startAt) : now;
  const end = input.endAt
    ? new Date(input.endAt)
    : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    ...input,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}
