/**
 * 🔥 Story Season Detector - 시즌 자동 판정기
 * 
 * 역할:
 * - 대회 일정 존재 여부로 시즌 모드 자동 판정
 * - 혼합 D 엔진의 mode 파라미터 결정
 */

import type { Story } from "./story.types";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 시즌 판정 결과
export type SeasonMode = "default" | "season";

// 시즌 판정 기준
export interface SeasonCriteria {
  // 대회 일정이 N개 이상 존재하면 시즌
  minTournamentSchedules?: number; // 기본: 2
  // 협회 스토리가 N개 이상이면 시즌
  minAssociationStories?: number; // 기본: 2
  // 특정 기간 내 대회가 있으면 시즌
  tournamentDateRange?: {
    start: number; // Timestamp seconds
    end: number; // Timestamp seconds
  };
}

const DEFAULT_CRITERIA: SeasonCriteria = {
  minTournamentSchedules: 2,
  minAssociationStories: 2,
};

/**
 * 대회 일정 존재 여부 확인
 */
async function hasTournamentSchedules(
  sportType: string = "soccer",
  criteria: SeasonCriteria = DEFAULT_CRITERIA
): Promise<boolean> {
  try {
    const now = Timestamp.now();
    const minCount = criteria.minTournamentSchedules ?? 2;

    // 대회 일정 컬렉션 조회 (실제 스키마에 맞게 수정 필요)
    const schedulesQuery = query(
      collection(db, "schedules"), // 또는 "tournaments", "matches" 등
      where("sportType", "==", sportType),
      where("type", "==", "tournament"), // 대회 타입
      where("dateTime", ">=", now)
    );

    const snapshot = await getDocs(schedulesQuery);
    return snapshot.docs.length >= minCount;
  } catch (error) {
    console.error("[SeasonDetector] 대회 일정 조회 실패:", error);
    return false;
  }
}

/**
 * 협회 스토리 개수 확인
 */
function countAssociationStories(
  stories: Story[],
  criteria: SeasonCriteria = DEFAULT_CRITERIA
): number {
  const minCount = criteria.minAssociationStories ?? 2;
  const associationCount = stories.filter(
    (s) => s.source === "협회"
  ).length;
  
  return associationCount >= minCount ? associationCount : 0;
}

/**
 * 시즌 모드 자동 판정
 * 
 * @param stories - 현재 스토리 목록
 * @param sportType - 스포츠 타입
 * @param criteria - 판정 기준 (선택)
 * @returns "season" | "default"
 */
export async function detectSeasonMode(
  stories: Story[],
  sportType: string = "soccer",
  criteria: SeasonCriteria = DEFAULT_CRITERIA
): Promise<SeasonMode> {
  // 협회 스토리 개수 확인
  const associationCount = countAssociationStories(stories, criteria);
  if (associationCount > 0) {
    return "season";
  }

  // 대회 일정 존재 여부 확인
  const hasTournaments = await hasTournamentSchedules(sportType, criteria);
  if (hasTournaments) {
    return "season";
  }

  // 특정 기간 내 대회 확인
  if (criteria.tournamentDateRange) {
    const { start, end } = criteria.tournamentDateRange;
    const now = Date.now() / 1000;
    if (now >= start && now <= end) {
      return "season";
    }
  }

  return "default";
}

/**
 * 시즌 모드 캐시 (5분)
 */
let seasonCache: {
  mode: SeasonMode;
  timestamp: number;
  sportType: string;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5분

/**
 * 캐시된 시즌 모드 조회
 */
export async function getCachedSeasonMode(
  stories: Story[],
  sportType: string = "soccer"
): Promise<SeasonMode> {
  // 캐시 확인
  if (seasonCache) {
    const cacheAge = Date.now() - seasonCache.timestamp;
    if (
      cacheAge < CACHE_DURATION &&
      seasonCache.sportType === sportType
    ) {
      return seasonCache.mode;
    }
  }

  // 새로 판정
  const mode = await detectSeasonMode(stories, sportType);
  
  // 캐시 저장
  seasonCache = {
    mode,
    timestamp: Date.now(),
    sportType,
  };

  return mode;
}
