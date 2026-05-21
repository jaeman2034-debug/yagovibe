/**
 * 🔥 Stats 문서 마이그레이션 (1회 실행)
 * 
 * 모든 tournament에 대해 stats/teams 생성
 * approvedCount = 현재 APPROVED 팀 수
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { syncStatsFromTeams } from "./tournamentStats";

const db = admin.firestore();

/**
 * 🔥 단일 대회 Stats 마이그레이션
 */
export async function migrateTournamentStats(
  associationId: string,
  tournamentId: string
): Promise<{ approvedCount: number }> {
  const result = await syncStatsFromTeams(associationId, tournamentId);
  
  logger.info("[migrateStats] ✅ 대회 Stats 마이그레이션 완료", {
    associationId,
    tournamentId,
    approvedCount: result.approvedCount,
  });
  
  return { approvedCount: result.approvedCount };
}

/**
 * 🔥 모든 대회 Stats 마이그레이션 (배치)
 */
export async function migrateAllTournamentsStats(
  associationId: string
): Promise<{ total: number; migrated: number; errors: number }> {
  const tournamentsRef = db.collection(
    `associations/${associationId}/tournaments`
  );
  
  const tournamentsSnap = await tournamentsRef.get();
  let migrated = 0;
  let errors = 0;
  
  for (const tournamentDoc of tournamentsSnap.docs) {
    try {
      await migrateTournamentStats(associationId, tournamentDoc.id);
      migrated++;
    } catch (error: any) {
      logger.error("[migrateStats] ❌ 마이그레이션 실패", {
        associationId,
        tournamentId: tournamentDoc.id,
        error: error.message,
      });
      errors++;
    }
  }
  
  logger.info("[migrateStats] ✅ 전체 마이그레이션 완료", {
    associationId,
    total: tournamentsSnap.size,
    migrated,
    errors,
  });
  
  return {
    total: tournamentsSnap.size,
    migrated,
    errors,
  };
}
