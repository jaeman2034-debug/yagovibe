import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";
import type { PersistedPlayFeedbackMood } from "@/types/playMatchFeedback";
import type { TeamPlayerStatsUI } from "@/types/teamPlayerStats";
import { PLAY_STAT_KEYS } from "@/utils/playerStats";
import type { PlayRecentGrowth } from "@/utils/playerStats";

type FeedbackRow = {
  memberId: string;
  mood: PersistedPlayFeedbackMood | "";
  expDelta: number;
  statGrowth: PlayRecentGrowth;
};

function sumPositiveGrowth(g: PlayRecentGrowth | undefined): number {
  if (!g) return 0;
  return PLAY_STAT_KEYS.reduce((acc, k) => acc + Math.max(0, Number(g[k] ?? 0)), 0);
}

function moodScore(m: PersistedPlayFeedbackMood | ""): number {
  if (m === "good") return 100;
  if (m === "normal") return 72;
  if (m === "bad") return 45;
  return 0;
}

/** 현재 경기 피드백으로 요약/공유 문구용 지표 */
export function usePlayMatchFeedbackRecap(
  teamId: string | undefined,
  matchId: string | undefined,
  rankedPlayers: readonly TeamPlayerStatsUI[]
) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    if (!tid || !mid) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const col = collection(db, "teams", tid, "matches", mid, "feedbacks");
    const unsub = onSnapshot(
      col,
      (snap) => {
        const list: FeedbackRow[] = [];
        for (const d of snap.docs) {
          const raw = d.data() as Record<string, unknown>;
          const moodRaw = String(raw.mood || "").trim();
          const mood: PersistedPlayFeedbackMood | "" =
            moodRaw === "good" || moodRaw === "normal" || moodRaw === "bad" ? moodRaw : "";
          const expDelta = typeof raw.expDelta === "number" && Number.isFinite(raw.expDelta) ? raw.expDelta : 0;
          const statGrowth = (raw.statGrowth as PlayRecentGrowth) || {};
          list.push({ memberId: d.id, mood, expDelta, statGrowth });
        }
        setRows(list);
        setLoading(false);
      },
      () => {
        setRows([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [teamId, matchId]);

  const nameByMemberId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of rankedPlayers) {
      m.set(p.memberId, p.displayName || "선수");
    }
    return m;
  }, [rankedPlayers]);

  const recap = useMemo(() => {
    const rosterMvp = rankedPlayers.find((p) => (p.badges || []).includes("MVP"));
    const rosterMvpName = rosterMvp?.displayName ?? rankedPlayers[0]?.displayName ?? null;

    if (rows.length === 0) {
      return {
        submittedCount: 0,
        rosterMvpName,
        growthStarName: null as string | null,
        fairnessScore: null as number | null,
        shareTitle: "이번 경기 플레이 요약",
        shareText: "",
        shareUrl: "",
      };
    }

    let bestMemberId: string | null = null;
    let bestSum = -1;
    for (const r of rows) {
      const s = sumPositiveGrowth(r.statGrowth);
      if (s > bestSum) {
        bestSum = s;
        bestMemberId = r.memberId;
      }
    }
    const growthStarName =
      bestMemberId && bestSum > 0 ? nameByMemberId.get(bestMemberId) ?? "팀원" : null;

    let expBestId: string | null = null;
    let expBest = -1;
    for (const r of rows) {
      if (r.expDelta > expBest) {
        expBest = r.expDelta;
        expBestId = r.memberId;
      }
    }
    const expStarName =
      expBestId && expBest > 0 ? nameByMemberId.get(expBestId) ?? "팀원" : null;

    const moods = rows.map((r) => r.mood).filter(Boolean) as PersistedPlayFeedbackMood[];
    const fairnessScore =
      moods.length > 0 ? Math.round(moods.reduce((a, m) => a + moodScore(m), 0) / moods.length) : null;

    const shareTitle = "이번 경기 플레이 요약";
    const parts: string[] = [];
    if (rosterMvpName) parts.push(`팀 카드 MVP: ${rosterMvpName}`);
    if (expStarName) parts.push(`오늘의 피드백 성장 스타 (EXP): ${expStarName}`);
    if (growthStarName && growthStarName !== expStarName) {
      parts.push(`능력치 상승 합 TOP: ${growthStarName}`);
    }
    if (fairnessScore != null) parts.push(`분위기 균형 지수: ${fairnessScore}점`);
    parts.push("야고 플레이 탭에서 팀과 함께 기록해요.");

    return {
      submittedCount: rows.length,
      rosterMvpName,
      growthStarName,
      fairnessScore,
      shareTitle,
      shareText: parts.join("\n"),
      shareUrl: "",
    };
  }, [rows, rankedPlayers, nameByMemberId]);

  const shareUrl = useMemo(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    if (typeof window === "undefined" || !tid || !mid) return "";
    return `${window.location.origin}${teamPlayEntryPath(tid, { matchId: mid })}`;
  }, [teamId, matchId]);

  const recapWithUrl = useMemo(
    () => ({
      ...recap,
      shareUrl,
      /** 공유 문구 전체에 URL 포함한 버전 (카카오 등 텍스트 공유용) */
      shareBodyWithLink: recap.shareText && shareUrl ? `${recap.shareText}\n${shareUrl}` : recap.shareText,
    }),
    [recap, shareUrl]
  );

  return { loading, rows, ...recapWithUrl };
}
