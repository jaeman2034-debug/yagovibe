import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { devError } from "@/lib/utils/dev";

export type PersistMiniShotSessionInput = {
  /** 멱등 키 — 라운드 시작 시 1회 생성해 동일 세션 재전송 방지 */
  sessionKey: string;
  teamId?: string | null;
  goals: number;
  shots: number;
  score: number;
  successPct: number;
  /** 슛당 정확도(0~1) 평균 */
  avgAccuracy: number;
  ovr: number;
  /** 연속 골 보너스 XP 합(슛마다 streak×2 누적) */
  streakXpBonus?: number;
};

/** 골·정확도 기반 세션 XP (Functions `finalizeMiniShotSession`와 동일 공식) */
export function computeMiniShotSessionXp(goals: number, avgAccuracy: number): number {
  return goals * 10 + Math.round(avgAccuracy * 50);
}

/**
 * 미니슛 5슛 세션 종료 시: 팀 세션/리더보드 + 사용자 XP는 Callable에서 처리.
 */
export async function persistMiniShotSessionEnd(input: PersistMiniShotSessionInput): Promise<void> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const sessionKey = typeof input.sessionKey === "string" ? input.sessionKey.trim() : "";
  if (!sessionKey || sessionKey.length < 8) {
    devError("persistMiniShotSessionEnd: sessionKey 없음");
    return;
  }

  const teamId = typeof input.teamId === "string" ? input.teamId.trim() : "";

  try {
    const fn = httpsCallable(functions, "finalizeMiniShotSession");
    await fn({
      sessionKey,
      teamId: teamId || null,
      goals: input.goals,
      shots: input.shots,
      score: input.score,
      successPct: input.successPct,
      avgAccuracy: input.avgAccuracy,
      ovr: input.ovr,
      streakXpBonus: input.streakXpBonus ?? 0,
    });
  } catch (e) {
    devError("미니슛 세션 저장(Callable) 실패:", e);
  }
}
