/**
 * 🔥 경기 결과 처리 및 다음 라운드 전파 로직
 * 관리자용 결과 입력 시 사용
 */

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 다음 라운드 경기에 승자 전파
 * 
 * 조건: match 문서에 nextMatchId, nextSlot: "home" | "away" 가 이미 들어있다는 전제
 * (generateMatches 구조에 맞음)
 * 
 * @param associationId 협회 ID
 * @param tournamentId 대회 ID
 * @param match 현재 경기 (winnerTeamId, nextMatchId, nextSlot 포함)
 */
export async function propagateWinner({
  associationId,
  tournamentId,
  match,
}: {
  associationId: string;
  tournamentId: string;
  match: any;
}) {
  if (!match.nextMatchId || !match.winnerTeamId) {
    return; // 다음 경기가 없거나 승자가 없으면 전파하지 않음
  }

  const nextRef = doc(
    db,
    "associations",
    associationId,
    "tournaments",
    tournamentId,
    "matches",
    match.nextMatchId
  );

  const snap = await getDoc(nextRef);
  if (!snap.exists()) {
    console.warn(`다음 경기를 찾을 수 없습니다: ${match.nextMatchId}`);
    return;
  }

  const nextMatch = snap.data();
  const field = match.nextSlot === "home" ? "homeTeamId" : "awayTeamId";
  const fieldName = match.nextSlot === "home" ? "homeTeamName" : "awayTeamName";

  // 승자 팀 정보 가져오기
  const winnerTeamId = match.winnerTeamId;
  const winnerTeamName = match.winnerTeamName || match.winnerTeamId;

  await updateDoc(nextRef, {
    [field]: winnerTeamId,
    [fieldName]: winnerTeamName,
    updatedAt: serverTimestamp(),
  });
}

