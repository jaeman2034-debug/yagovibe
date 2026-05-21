/**
 * 🔥 Stories Repository - 오프라인 우선 리포지토리
 * 
 * 전략: Local Cache → Seed → API
 * 인터넷 없어도 무조건 동작
 * 
 * 우선순위:
 * 1. Local Cache (10분 TTL)
 * 2. Seed 데이터
 * 3. API
 */

import type { Story } from "../domain/story.types";
import type { Region } from "../domain/region.types";
import { seedStories } from "./story.seed";
import { getStories } from "./stories.api";
import { getLeagues } from "./league.api";
import { fetchAssocLeagues } from "./assoc.api";
import { getStoriesForRegion } from "../domain/story.engine";
import { detectSeasonDecision } from "../domain/season.detector";
import {
  saveStoriesCache,
  loadStoriesCache,
  isOnline,
} from "./offline.storage";

export type StoriesLoadResult = {
  storiesForZone: Story[];
  mode: "default" | "season";
  decisionReason: string;
  serverTime?: string;
  from: "api" | "cache" | "seed";
};

/**
 * 스토리 존용 스토리 로드 (오프라인 우선 + 시즌 모드 자동 판정 + 지역 필터링)
 * 
 * 우선순위:
 * 1. Local Cache (10분 TTL)
 * 2. API (온라인 시)
 * 3. Seed (최종 폴백)
 * 
 * 지역 필터링:
 * - 모든 스토리는 region 기준으로 필터링
 */
export async function loadStoriesForZone(region?: Region): Promise<StoriesLoadResult> {
  // 1. 캐시 우선 확인
  const cached = loadStoriesCache();
  if (cached) {
    // 지역 필터링
    const filtered = region ? cached.filter((s) => s.region === region) : cached;
    const decision = detectSeasonDecision(null, filtered);
    const storiesForZone = getStoriesForRegion(filtered, region || "seoul", decision.mode);
    
    if (storiesForZone.length > 0) {
      return {
        storiesForZone,
        mode: decision.mode,
        decisionReason: decision.reason,
        from: "cache",
      };
    }
  }

  // 2. API 시도 (온라인 시)
  if (isOnline()) {
    try {
      // 타임아웃 3초
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      );

      // 협회 대회도 함께 조회 (시즌 판정용)
      const [storyRes, leagues, assocLeagues] = await Promise.race([
        Promise.all([
          getStories(),
          getLeagues(), // 실패해도 null 반환
          fetchAssocLeagues(), // 협회 대회 (실패해도 null)
        ]),
        timeoutPromise,
      ]) as [
        Awaited<ReturnType<typeof getStories>>,
        Awaited<ReturnType<typeof getLeagues>>,
        Awaited<ReturnType<typeof fetchAssocLeagues>>
      ];

      // 캐시 저장 (전체 스토리, 지역 필터링은 조회 시)
      saveStoriesCache(storyRes.stories);

      // 지역 필터링
      const filteredStories = region
        ? storyRes.stories.filter((s) => s.region === region)
        : storyRes.stories;

      // 시즌 모드 자동 판정 (일반 대회 + 협회 대회 통합)
      const allLeagues = [
        ...(leagues || []),
        ...(assocLeagues || []).map((l) => ({
          id: l.id,
          startAt: l.startDate,
          endAt: l.endDate,
        })),
      ];
      const decision = detectSeasonDecision(
        allLeagues.length > 0 ? allLeagues : null,
        filteredStories
      );
      const storiesForZone = getStoriesForRegion(
        filteredStories,
        region || "seoul",
        decision.mode
      );

      // 노출 리스트가 비면 seed로 폴백
      if (!storiesForZone.length) {
        return {
          storiesForZone: getStoriesForZone(seedStories, "default"),
          mode: "default",
          decisionReason: "seed_fallback",
          from: "seed",
        };
      }

      return {
        storiesForZone,
        mode: decision.mode,
        decisionReason: decision.reason,
        serverTime: storyRes.serverTime,
        from: "api",
      };
    } catch (error) {
      // API 실패 시 캐시 재확인 또는 seed로 폴백
      const fallbackCache = loadStoriesCache();
      if (fallbackCache) {
        const decision = detectSeasonDecision(null, fallbackCache);
        const storiesForZone = getStoriesForZone(fallbackCache, decision.mode);
        if (storiesForZone.length > 0) {
          return {
            storiesForZone,
            mode: decision.mode,
            decisionReason: decision.reason,
            from: "cache",
          };
        }
      }
    }
  }

  // 3. Seed (최종 폴백, 지역별)
  const { createSeedStories } = require("./story.seed");
  const regionSeed = createSeedStories(region || "seoul");
  return {
    storiesForZone: getStoriesForRegion(regionSeed, region || "seoul", "default"),
    mode: "default",
    decisionReason: "offline_seed_fallback",
    from: "seed",
  };
}
