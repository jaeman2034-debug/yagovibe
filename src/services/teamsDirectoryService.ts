/**
 * 🔥 Teams Directory 서비스
 * 
 * 역할:
 * - 팀 목록 조회
 * - 팀 검색
 * - 팀 필터링/정렬
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchTeam } from "./teamService";
import { getTeamSummary } from "./teamSummaryService";

export interface TeamDirectoryItem {
  teamId: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  region?: string;
  organizationId?: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  championships: number;
  isActive: boolean;
}

export type TeamSortOption = "name" | "wins" | "matches" | "championships" | "recent";

/**
 * Teams Directory 조회
 */
export async function getTeamsDirectory(options?: {
  query?: string;
  organizationId?: string;
  isActive?: boolean;
  sort?: TeamSortOption;
  limit?: number;
}): Promise<TeamDirectoryItem[]> {
  try {
    // search_index에서 팀 검색
    let searchResults: string[] = [];

    if (options?.query) {
      const { searchByType } = await import("./searchService");
      const searchItems = await searchByType("team", options.query, {
        limit: options.limit || 50,
      });
      searchResults = searchItems.map((item) => item.entityId);
    }

    // teams 컬렉션에서 조회
    let teamsQuery = query(collection(db, "teams"));

    if (options?.organizationId) {
      teamsQuery = query(teamsQuery, where("organizationId", "==", options.organizationId)) as any;
    }

    if (options?.isActive !== undefined) {
      teamsQuery = query(teamsQuery, where("isActive", "==", options.isActive)) as any;
    }

    // 정렬
    if (options?.sort === "name") {
      teamsQuery = query(teamsQuery, orderBy("name", "asc")) as any;
    } else if (options?.sort === "recent") {
      teamsQuery = query(teamsQuery, orderBy("updatedAt", "desc")) as any;
    }

    if (options?.limit) {
      teamsQuery = query(teamsQuery, limit(options.limit)) as any;
    }

    const teamsSnap = await getDocs(teamsQuery);
    const teams: TeamDirectoryItem[] = [];

    for (const doc of teamsSnap.docs) {
      const teamData = doc.data();
      const teamId = doc.id;

      // 검색 쿼리가 있고 결과에 포함되지 않으면 스킵
      if (options?.query && searchResults.length > 0 && !searchResults.includes(teamId)) {
        continue;
      }

      // team_summary 조회
      const summary = await getTeamSummary(teamId);

      teams.push({
        teamId,
        name: teamData.name || "",
        slug: teamData.slug,
        logoUrl: teamData.logoUrl,
        region: teamData.region,
        organizationId: teamData.organizationId,
        matches: summary?.matches || 0,
        wins: summary?.wins || 0,
        draws: summary?.draws || 0,
        losses: summary?.losses || 0,
        goalsFor: summary?.goalsFor || 0,
        championships: summary?.championships || 0,
        isActive: teamData.isActive ?? true,
      });
    }

    // 클라이언트 사이드 정렬 (summary 기반)
    if (options?.sort === "wins") {
      teams.sort((a, b) => b.wins - a.wins);
    } else if (options?.sort === "matches") {
      teams.sort((a, b) => b.matches - a.matches);
    } else if (options?.sort === "championships") {
      teams.sort((a, b) => b.championships - a.championships);
    }

    return teams;
  } catch (error) {
    console.error("[getTeamsDirectory] 조회 실패:", error);
    return [];
  }
}
