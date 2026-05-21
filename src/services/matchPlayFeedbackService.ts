/**
 * 경기별 피드백 + playerStats 즉시 반영 (원자 처리)
 *
 * teams/{teamId}/matches/{matchId}/feedbacks/{memberId}
 * matchId = 공용 team_games 문서 ID
 */

import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MatchFeedbackMood } from "@/types/teamPlayerStats";
import type { PersistedPlayFeedbackMood, PlayFeedbackSubmitSummary } from "@/types/playMatchFeedback";
import type { TeamGame } from "@/types/teamGame";
import {
  playerStatDocRef,
  buildPlayerUpdateFromMood,
  syncTeamMvpBadge,
} from "@/services/teamPlayerStatsService";
import type { TeamPlayerStatsFirestoreDoc } from "@/types/teamPlayerStats";
import { calculateLevel, calculateOVR, createDefaultStats, normalizePlaySix } from "@/utils/playerStats";
import { callSubmitPlayMatchFeedbackRemote } from "@/lib/play/callSubmitPlayMatchFeedbackRemote";

export function persistedMood(ui: MatchFeedbackMood): PersistedPlayFeedbackMood {
  if (ui === "ok") return "normal";
  if (ui === "bad") return "bad";
  return "good";
}

export function teamMatchStubDocRef(teamId: string, matchId: string) {
  return doc(db, "teams", teamId, "matches", matchId);
}

export function teamMatchFeedbackDocRef(teamId: string, matchId: string, memberId: string) {
  return doc(db, "teams", teamId, "matches", matchId, "feedbacks", memberId);
}

function usePlayFeedbackCallable(): boolean {
  return import.meta.env.VITE_PLAY_FEEDBACK_USE_CALLABLE === "1";
}

/** 클라이언트 트랜잭션 경로 (비배포·개발 기본) */
export async function submitPlayMatchFeedbackClient(input: {
  teamId: string;
  matchId: string;
  memberId: string;
  userId: string;
  mood: MatchFeedbackMood;
}): Promise<PlayFeedbackSubmitSummary> {
  const { teamId, matchId, memberId, userId, mood } = input;
  if (!teamId?.trim() || !matchId?.trim() || !memberId?.trim() || !userId?.trim()) {
    throw new Error("팀·경기·멤버·사용자 정보가 필요합니다.");
  }

  const gameRef = doc(db, "team_games", matchId);
  const feedbackRef = teamMatchFeedbackDocRef(teamId, matchId, memberId);
  const playerRef = playerStatDocRef(teamId, memberId);
  const stubRef = teamMatchStubDocRef(teamId, matchId);

  let summary!: PlayFeedbackSubmitSummary;

  await runTransaction(db, async (tx) => {
    const [gameSnap, fbSnap, pSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(feedbackRef),
      tx.get(playerRef),
    ]);

    if (fbSnap.exists()) throw new Error("이미 이 경기에 대한 피드백을 보냈어요.");
    if (!pSnap.exists()) throw new Error("플레이 카드가 없습니다. 먼저 카드를 생성해 주세요.");
    if (!gameSnap.exists()) throw new Error("경기 기록(team_games)을 찾을 수 없어요.");

    const game = { id: gameSnap.id, ...gameSnap.data() } as TeamGame;
    const inTeam = game.homeTeamId === teamId || game.awayTeamId === teamId;
    if (!inTeam) throw new Error("우리 팀 경기만 피드백할 수 있습니다.");
    if (game.status !== "completed") throw new Error("종료된 경기만 피드백할 수 있습니다.");

    const rawStats = pSnap.data() as TeamPlayerStatsFirestoreDoc;
    const linkUser = typeof rawStats.userId === "string" ? rawStats.userId.trim() : "";
    if (linkUser !== userId.trim()) throw new Error("내 계정 카드만 갱신할 수 있습니다.");

    const prevNorm = normalizePlaySix(rawStats.stats ?? createDefaultStats());
    const prevOvr = calculateOVR(prevNorm);
    const prevExp = Math.max(0, Math.floor(Number(rawStats.exp) || 0));
    const prevLevel = calculateLevel(prevExp);

    const u = buildPlayerUpdateFromMood(rawStats, mood);

    summary = {
      prevOvr,
      nextOvr: u.ovr,
      prevExp,
      nextExp: u.exp,
      prevLevel,
      nextLevel: u.level,
      expDelta: u.expDelta,
      growth: { ...u.recentGrowth },
      moodPersisted: persistedMood(mood),
    };

    tx.set(
      stubRef,
      {
        teamId,
        matchId,
        linkedTeamGameId: matchId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(feedbackRef, {
      teamId,
      matchId,
      memberId,
      userId: userId.trim(),
      mood: persistedMood(mood),
      expDelta: u.expDelta,
      statGrowth: u.recentGrowth,
      createdAt: serverTimestamp(),
    });

    tx.update(playerRef, {
      stats: u.stats,
      recentGrowth: u.recentGrowth,
      exp: u.exp,
      level: u.level,
      ovr: u.ovr,
      lastMatchAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await syncTeamMvpBadge(teamId);
  return summary;
}

/**
 * 기본: 클라이언트 트랜잭션
 * `VITE_PLAY_FEEDBACK_USE_CALLABLE=1` 이면 Cloud Function(서버 검증) 경로
 */
export async function submitPlayMatchFeedback(input: {
  teamId: string;
  matchId: string;
  memberId: string;
  userId: string;
  mood: MatchFeedbackMood;
}): Promise<PlayFeedbackSubmitSummary> {
  if (usePlayFeedbackCallable()) {
    return callSubmitPlayMatchFeedbackRemote({
      teamId: input.teamId,
      matchId: input.matchId,
      memberId: input.memberId,
      mood: input.mood,
    });
  }
  return submitPlayMatchFeedbackClient(input);
}

export async function hasPlayMatchFeedback(
  teamId: string,
  matchId: string,
  memberId: string
): Promise<boolean> {
  const r = teamMatchFeedbackDocRef(teamId, matchId, memberId);
  const s = await getDoc(r);
  return s.exists();
}

/** team_games 스냅샷을 경기 라벨로 */
export function formatTeamGameLabel(teamId: string, g: TeamGame): string {
  const isHome = g.homeTeamId === teamId;
  const opp = isHome ? g.awayTeamName : g.homeTeamName;
  const ms = g.scheduledAt?.toMillis?.() ?? 0;
  const d = ms ? new Date(ms).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "";
  const hs = typeof g.homeScore === "number" ? g.homeScore : "—";
  const as = typeof g.awayScore === "number" ? g.awayScore : "—";
  const score = g.status === "completed" ? ` ${isHome ? `${hs}:${as}` : `${as}:${hs}`}` : "";
  return `${d} vs ${opp}${score}`.trim();
}
