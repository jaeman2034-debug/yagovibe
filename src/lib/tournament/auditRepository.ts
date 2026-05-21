/**
 * 🔥 관리자 로그 뷰 Repository
 * Step 3: 관리자 로그 뷰 (Audit / Timeline)
 */

import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOURNAMENT_COLLECTIONS } from "./constants";
import type { AuditLog } from "@/types/auditLog";

/**
 * 경기 로그 한번에 수집
 */
export async function getMatchAuditLogs(
  associationId: string,
  tournamentId: string,
  matchId: string
): Promise<AuditLog[]> {
  const logs: AuditLog[] = [];

  try {
    // 1) Check-ins (검인 기록)
    const checkinsRef = collection(
      db,
      TOURNAMENT_COLLECTIONS.checkins(associationId, tournamentId, matchId)
    );
    const checkinsSnap = await getDocs(checkinsRef);
    checkinsSnap.forEach((doc) => {
      const d = doc.data() as any;
      logs.push({
        type: "CHECKIN",
        at: d.checkedAt?.toDate?.() ?? new Date(d.checkedAt),
        actorId: d.checkedBy || "unknown",
        playerId: d.playerId || doc.id,
        method: d.method || "QR",
      });
    });

    // 2) Cards (경고/퇴장)
    const cardsRef = collection(
      db,
      TOURNAMENT_COLLECTIONS.cards(associationId, tournamentId, matchId)
    );
    const cardsSnap = await getDocs(cardsRef);
    cardsSnap.forEach((doc) => {
      const d = doc.data() as any;
      logs.push({
        type: "CARD",
        at: d.createdAt?.toDate?.() ?? d.recordedAt?.toDate?.() ?? new Date(d.createdAt || d.recordedAt),
        actorId: d.refereeId || d.recordedBy || "unknown",
        playerId: d.playerId || "unknown",
        cardType: d.type || "YELLOW",
        minute: d.minute || 0,
      });
    });

    // 3) Memos (심판 메모)
    const memosRef = collection(
      db,
      TOURNAMENT_COLLECTIONS.memos(associationId, tournamentId, matchId)
    );
    const memosSnap = await getDocs(memosRef);
    memosSnap.forEach((doc) => {
      const d = doc.data() as any;
      logs.push({
        type: "MEMO",
        at: d.createdAt?.toDate?.() ?? new Date(d.createdAt),
        actorId: d.createdBy || "unknown",
        text: d.text || "",
      });
    });
  } catch (error) {
    console.error("로그 수집 오류:", error);
  }

  // 시간순 정렬 (오래된 것부터)
  logs.sort((a, b) => a.at.getTime() - b.at.getTime());
  return logs;
}

