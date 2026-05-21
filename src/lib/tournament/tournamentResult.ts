/**
 * 🔥 대회 결과 관리 (STEP: 대회 결과/기록 시스템)
 * 
 * 핵심 원칙:
 * - 결과는 '대회-팀 관계의 확장 문서'
 * - 수정은 updateDoc으로
 * - 삭제 ❌ (히스토리 보호)
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentResult } from "@/types/tournament";

/**
 * 대회 결과 저장
 */
export async function saveTournamentResult({
  tournamentId,
  teamId,
  rank,
  score,
  resultText,
}: {
  tournamentId: string;
  teamId: string;
  rank?: number;
  score?: number;
  resultText?: string;
}): Promise<string> {
  const resultsRef = collection(db, "tournamentResults");

  const resultData = {
    tournamentId,
    teamId,
    recordedAt: serverTimestamp(),
    ...(rank !== undefined && { rank }),
    ...(score !== undefined && { score }),
    ...(resultText && { resultText }),
  };

  const docRef = await addDoc(resultsRef, resultData);
  return docRef.id;
}

/**
 * 대회 결과 수정
 */
export async function updateTournamentResult(
  resultId: string,
  updates: {
    rank?: number;
    score?: number;
    resultText?: string;
  }
): Promise<void> {
  const resultRef = doc(db, "tournamentResults", resultId);

  await updateDoc(resultRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
