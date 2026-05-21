/**
 * 🔥 Story Engine - 혼합 D 엔진 핵심 (최종본)
 * 
 * ActiveNow 필터 포함
 */

import type { Story, StorySource } from "./story.types";
import { isUsableStory } from "./story.guard";
import { filterActiveStories, isActiveNow } from "./story.active.filter";

type MixMode = "default" | "season";

type MixConfig = {
  mode: MixMode;
  maxSlots: number; // 보통 5
};

const takeSorted = (arr: Story[], n: number) =>
  arr
    .slice()
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, n);

const filterUserQuality = (arr: Story[]) =>
  arr.filter((s) => s.isVerifiedAuthor || (s.score ?? 0) >= 50);

const fill = (result: Story[], pools: Record<StorySource, Story[]>, maxSlots: number) => {
  if (result.length >= maxSlots) return result.slice(0, maxSlots);

  // 빈칸 채우기 우선순위: 운영 → 협회 → 사용자(퀄리티 통과분)
  const order: StorySource[] = ["운영", "협회", "사용자"];
  for (const src of order) {
    for (const s of pools[src]) {
      if (result.length >= maxSlots) break;
      if (result.some((x) => x.id === s.id)) continue;
      result.push(s);
    }
  }
  return result.slice(0, maxSlots);
};

/**
 * 혼합 D 엔진 (ActiveNow 필터 포함)
 */
export const mixStoriesD = (allStories: Story[], config: MixConfig) => {
  // 1. 유효성 검증
  const safe = allStories.filter(isUsableStory);
  
  // 2. ActiveNow 필터 (PUBLISHED + 기간 내)
  const active = filterActiveStories(safe);

  const pools: Record<StorySource, Story[]> = {
    운영: active.filter((s) => s.source === "운영"),
    협회: active.filter((s) => s.source === "협회"),
    사용자: filterUserQuality(active.filter((s) => s.source === "사용자")),
  };

  const result: Story[] = [];

  if (config.mode === "season") {
    result.push(...takeSorted(pools["협회"], 2));
    result.push(...takeSorted(pools["운영"], 1));
    result.push(...takeSorted(pools["사용자"], 1));
  } else {
    result.push(...takeSorted(pools["운영"], 2));
    result.push(...takeSorted(pools["협회"], 1));
    result.push(...takeSorted(pools["사용자"], 1));
  }

  return fill(result, pools, config.maxSlots);
};

/**
 * 스토리 준비 (유효성 + ActiveNow)
 */
export function prepareStories(list: Story[]): Story[] {
  return list.filter(isUsableStory).filter((s) => isActiveNow(s));
}

/**
 * 스토리 존용 스토리 조회 (최종)
 */
export function getStoriesForZone(
  list: Story[],
  mode: "default" | "season" = "default"
): Story[] {
  const active = prepareStories(list);
  
  // 활성 스토리가 없으면 빈 배열 반환 (seed는 상위에서 처리)
  if (active.length === 0) {
    return [];
  }
  
  return mixStoriesD(active, { mode, maxSlots: 5 });
}

/**
 * 지역별 스토리 조회 (멀티 허브)
 */
export function getStoriesForRegion(
  stories: Story[],
  region: string,
  mode: "default" | "season" = "default"
): Story[] {
  // 지역 필터링
  const filtered = stories.filter((s) => s.region === region);
  
  // 엔진 통과
  return getStoriesForZone(filtered, mode);
}
