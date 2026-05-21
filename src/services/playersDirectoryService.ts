/**
 * 🔥 Players Directory 서비스
 * 
 * 역할:
 * - 선수 목록 조회
 * - 선수 검색
 * - 선수 필터링/정렬
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
import { getPlayerSummary } from "./playerSummaryService";
import { fetchTeam } from "./teamService";

export interface PlayerDirectoryItem {
  playerId: string;
  name: string;
  slug?: string;
  profileImageUrl?: string;
  currentTeamId?: string;
  currentTeamName?: string;
  primaryPosition?: string;
  appearances: number;
  goals: number;
  assists: number;
  isActive: boolean;
}

export type PlayerSortOption = "name" | "goals" | "assists" | "appearances" | "recent";

/**
 * Players Directory 조회
 */
export async function getPlayersDirectory(options?: {
  query?: string;
  teamId?: string;
  position?: string;
  isActive?: boolean;
  sort?: PlayerSortOption;
  limit?: number;
}): Promise<PlayerDirectoryItem[]> {
  try {
    // search_index에서 선수 검색
    let searchResults: string[] = [];

    if (options?.query) {
      const { searchByType } = await import("./searchService");
      const searchItems = await searchByType("player", options.query, {
        limit: options.limit || 50,
      });
      searchResults = searchItems.map((item) => item.entityId);
    }

    // users 컬렉션에서 조회 (선수는 users 컬렉션에 저장)
    let playersQuery = query(collection(db, "users"));

    if (options?.position) {
      playersQuery = query(playersQuery, where("position", "==", options.position)) as any;
    }

    if (options?.isActive !== undefined) {
      playersQuery = query(playersQuery, where("isActive", "==", options.isActive)) as any;
    }

    // 정렬
    if (options?.sort === "name") {
      playersQuery = query(playersQuery, orderBy("displayName", "asc")) as any;
    } else if (options?.sort === "recent") {
      playersQuery = query(playersQuery, orderBy("updatedAt", "desc")) as any;
    }

    if (options?.limit) {
      playersQuery = query(playersQuery, limit(options.limit)) as any;
    }

    const playersSnap = await getDocs(playersQuery);
    const players: PlayerDirectoryItem[] = [];

    for (const doc of playersSnap.docs) {
      const playerData = doc.data();
      const playerId = doc.id;

      // 검색 쿼리가 있고 결과에 포함되지 않으면 스킵
      if (options?.query && searchResults.length > 0 && !searchResults.includes(playerId)) {
        continue;
      }

      // player_summary 조회
      const summary = await getPlayerSummary(playerId);

      // currentTeamId 필터링
      if (options?.teamId && summary?.currentTeamId !== options.teamId) {
        continue;
      }

      // 현재 팀 정보 조회
      let currentTeamName: string | undefined;
      if (summary?.currentTeamId) {
        const team = await fetchTeam(summary.currentTeamId);
        currentTeamName = team?.name;
      }

      const playerName =
        playerData.displayName || playerData.name || playerData.nickname || playerData.email?.split("@")[0] || playerId;

      players.push({
        playerId,
        name: playerName,
        slug: playerData.slug,
        profileImageUrl: playerData.photoURL || playerData.profileImageUrl,
        currentTeamId: summary?.currentTeamId,
        currentTeamName,
        primaryPosition: playerData.position || playerData.primaryPosition,
        appearances: summary?.appearances || 0,
        goals: summary?.goals || 0,
        assists: summary?.assists || 0,
        isActive: playerData.isActive ?? true,
      });
    }

    // 클라이언트 사이드 정렬 (summary 기반)
    if (options?.sort === "goals") {
      players.sort((a, b) => b.goals - a.goals);
    } else if (options?.sort === "assists") {
      players.sort((a, b) => b.assists - a.assists);
    } else if (options?.sort === "appearances") {
      players.sort((a, b) => b.appearances - a.appearances);
    }

    return players;
  } catch (error) {
    console.error("[getPlayersDirectory] 조회 실패:", error);
    return [];
  }
}
