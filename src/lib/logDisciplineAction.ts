/**
 * 징계 로그 기록 유틸리티
 * 
 * 부정선수 / 문제 발생 시 자동 로그 생성
 * 시스템 로그 문장 (자동):
 * [DISCIPLINE]
 * 대회명: ○○대회
 * 사유: 자격 미달 선수 등록
 * 조치: 해당 경기 몰수패
 * 결정 주체: 협회
 */

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { DisciplineLog } from "@/types/tournament";

export async function logDisciplineAction(
  tournamentId: string,
  tournamentName: string,
  reason: string,
  action: string,
  entryId?: string,
  teamId?: string,
  teamName?: string
): Promise<void> {
  try {
    const tournamentRef = collection(db, `associations/*/tournaments/${tournamentId}/discipline_logs`);
    
    // 실제로는 associationId를 찾아야 하지만, 임시로 구조만 정의
    // TODO: associationId를 파라미터로 받거나 tournament에서 조회
    
    const logData: Omit<DisciplineLog, "id" | "createdAt"> = {
      tournamentId,
      tournamentName,
      reason,
      action,
      decisionMaker: "협회",
      entryId,
      teamId,
      teamName,
    };

    // TODO: 올바른 경로로 수정 필요 (associationId 필요)
    // 현재는 구조만 정의
    console.log("[DISCIPLINE LOG]", logData);
  } catch (error) {
    console.error("Error logging discipline action:", error);
  }
}

