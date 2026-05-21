/**
 * 🔥 토너먼트 운영 로그 기록 유틸
 * 
 * 기능:
 * - Firestore에 영구 로그 저장
 * - 경기 생성 / 결과 입력 / 대회 종료 등 기록
 * - 운영 신뢰성 확보
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TournamentLogType =
  | "MATCH_AUTO_GENERATED"
  | "MATCH_RESULT"
  | "MATCH_RESULT_UNDO"
  | "TOURNAMENT_FINISHED"
  | "MODE_SWITCH";

export type TournamentLogActor = "system" | "admin";

export async function writeTournamentLog({
  associationId,
  tournamentId,
  type,
  message,
  actor = "system",
}: {
  associationId: string;
  tournamentId: string;
  type: TournamentLogType;
  message: string;
  actor?: TournamentLogActor;
}) {
  const logsRef = collection(
    db,
    "associations",
    associationId,
    "tournaments",
    tournamentId,
    "logs"
  );

  await addDoc(logsRef, {
    type,
    message,
    actor,
    createdAt: serverTimestamp(),
  });
}

