/**
 * 🔥 Share - 공유/딥링크 유틸리티
 * 
 * Week7 핵심: 지역별 공유 URL 생성
 */

import { getRegionName } from "./region.query";

const BASE_URL = process.env.BASE_URL || "https://hub.com";

/**
 * 공유 URL 생성
 */
export function buildShareUrl(
  type: "story" | "team" | "ground" | "league",
  id: string,
  region: string
): string {
  return `${BASE_URL}/r/${region}/${type}/${id}`;
}

/**
 * 스토리 공유 URL
 */
export function buildStoryShareUrl(storyId: string, region: string): string {
  return buildShareUrl("story", storyId, region);
}

/**
 * 팀 공유 URL
 */
export function buildTeamShareUrl(teamId: string, region: string): string {
  return buildShareUrl("team", teamId, region);
}

/**
 * 구장 공유 URL
 */
export function buildGroundShareUrl(groundId: string, region: string): string {
  return buildShareUrl("ground", groundId, region);
}

/**
 * 리그 공유 URL
 */
export function buildLeagueShareUrl(leagueId: string, region: string): string {
  return buildShareUrl("league", leagueId, region);
}

/**
 * 공유 메타데이터 생성
 */
export function buildShareMeta(
  type: "story" | "team" | "ground" | "league",
  data: {
    title: string;
    description?: string;
    image?: string;
    region: string;
  }
): {
  title: string;
  description: string;
  image: string;
  url: string;
} {
  const regionName = getRegionName(data.region);

  return {
    title: `${data.title} - ${regionName} 축구 허브`,
    description:
      data.description ||
      `${regionName} 지역의 축구 커뮤니티에서 만나보세요.`,
    image: data.image || `${BASE_URL}/og-image-${data.region}.jpg`,
    url: buildShareUrl(type, "id", data.region), // 실제 ID는 호출 시 교체
  };
}

/**
 * 딥링크 파싱
 */
export function parseDeepLink(url: string): {
  region: string;
  type: "story" | "team" | "ground" | "league";
  id: string;
} | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length < 4 || pathParts[0] !== "r") {
      return null;
    }

    const region = pathParts[1];
    const type = pathParts[2] as "story" | "team" | "ground" | "league";
    const id = pathParts[3];

    if (!["story", "team", "ground", "league"].includes(type)) {
      return null;
    }

    return { region, type, id };
  } catch {
    return null;
  }
}
