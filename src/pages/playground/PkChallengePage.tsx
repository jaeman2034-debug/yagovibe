import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useAcceptedFriendPeerUids } from "@/hooks/useAcceptedFriendPeerUids";
import { usePkChallengeBestScores } from "@/hooks/usePkChallengeBestScores";
import { createPkChallengeSubmission } from "@/services/challengeService";
import { CHALLENGE_FRIEND_SCORE_QUERY_LIMIT } from "@/lib/challenge/constants";
import {
  CHALLENGE_REWARD_MAX_GRANTS_PER_UTC_DAY,
  CHALLENGE_REWARD_XP_PER_GRANT,
} from "@/lib/challenge/challengeRewardConstants";
import {
  claimChallengeRewardForSubmission,
  notifyChallengeRewardClaim,
} from "@/lib/challenge/claimChallengeRewardClient";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import { toast } from "sonner";

function shortUid(uid: string): string {
  if (uid.length <= 8) return uid;
  return `${uid.slice(0, 6)}…`;
}

/**
 * PR-9A/PR-10A: PK 비동기 챌린지 — 클라이언트 점수(토이 시그널).
 * XP는 Callable이 역대 최고 갱신·UTC 일일 한도 내에서만 지급합니다.
 */
export default function PkChallengePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid;
  const isAnon = user?.isAnonymous;

  const [pendingMeta, setPendingMeta] = useState<{
    score: number;
    shotsTaken: number;
    goals: number;
    durationMs: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoreRefresh, setScoreRefresh] = useState(0);

  const { peerUids, loading: peersLoading } = useAcceptedFriendPeerUids(uid, isAnon);
  const { myBest, friendRows, scoresLoading, scoresError } = usePkChallengeBestScores(
    uid,
    isAnon,
    peerUids,
    peersLoading,
    scoreRefresh,
  );

  const runDemoRound = () => {
    const shotsTaken = 5;
    const goals = Math.floor(Math.random() * (shotsTaken + 1));
    const misses = shotsTaken - goals;
    const score = Math.max(0, Math.min(1000, goals * 100 - misses * 10 + Math.floor(Math.random() * 40)));
    const durationMs = 8000 + Math.floor(Math.random() * 12000);
    setPendingMeta({ score, shotsTaken, goals, durationMs });
    toast.message(`연습 결과: ${goals}/${shotsTaken} 골 · 점수 ${score}`);
  };

  const submitPending = async () => {
    if (!uid || isAnon || !pendingMeta) {
      toast.error("로그인이 필요해요.");
      return;
    }
    setSubmitting(true);
    try {
      const submissionId = await createPkChallengeSubmission(
        uid,
        pendingMeta.score,
        {
          shotsTaken: pendingMeta.shotsTaken,
          goals: pendingMeta.goals,
          durationMs: pendingMeta.durationMs,
        },
        uid,
      );
      toast.success("기록을 남겼어요.");
      try {
        const reward = await claimChallengeRewardForSubmission(submissionId);
        notifyChallengeRewardClaim(reward);
      } catch (e) {
        console.error(e);
        toast.error(callableErrorMessage(e));
      }
      setPendingMeta(null);
      setScoreRefresh((n) => n + 1);
    } catch (e) {
      console.error(e);
      toast.error("제출에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const friendWithScore = friendRows.filter((r) => r.best != null);
  const topFriend = [...friendRows].sort((a, b) => (b.best ?? -1) - (a.best ?? -1))[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-slate-50">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("/playground")}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            ← 운동장
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200/90">PK 챌린지</span>
          <span className="w-[72px]" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 pb-16 pt-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h1 className="text-lg font-bold text-white">비동기 PK</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            실시간 대전 없이 점수만 남기고 친구와 나중에 비교해요. 점수는{" "}
            <span className="font-semibold text-amber-200/90">연습용 시그널</span>이며, 역대 최고를{" "}
            <span className="font-semibold text-emerald-200/90">엄격히 넘긴</span> 제출에 한해 서버에서 아바타 XP를
            줄 수 있어요(회당 {CHALLENGE_REWARD_XP_PER_GRANT} XP · UTC 하루 최대 {CHALLENGE_REWARD_MAX_GRANTS_PER_UTC_DAY}회,
            PK·드리블 합산). 동점·이전 기록 이하는 보상 없음.
          </p>
        </section>

        <section className="rounded-2xl border border-indigo-400/25 bg-indigo-950/30 p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-200">한 판 돌리기 (데모)</h2>
          <p className="mt-2 text-sm text-slate-300">버튼을 누르면 이 기기에서 연습 라운드가 시뮬레이션됩니다.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runDemoRound}
              disabled={!uid || Boolean(isAnon)}
              className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-900/30 hover:bg-indigo-400 disabled:opacity-40"
            >
              연습 라운드 시뮬레이션
            </button>
            {pendingMeta ? (
              <button
                type="button"
                onClick={() => void submitPending()}
                disabled={submitting}
                className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-sm font-bold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-40"
              >
                {submitting ? "제출 중…" : `이 결과 제출 (${pendingMeta.score}점)`}
              </button>
            ) : null}
          </div>
          {!uid || isAnon ? (
            <p className="mt-3 text-xs text-amber-200/90">로그인 후 제출할 수 있어요.</p>
          ) : null}
          {pendingMeta ? (
            <p className="mt-3 font-mono text-xs text-slate-400">
              골 {pendingMeta.goals}/{pendingMeta.shotsTaken} · 약 {(pendingMeta.durationMs / 1000).toFixed(1)}초
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">가벼운 비교</h2>
          {peerUids.length > CHALLENGE_FRIEND_SCORE_QUERY_LIMIT ? (
            <p className="mt-2 text-[10px] leading-snug text-slate-500">
              수락 친구 중 <span className="font-semibold text-slate-400">최대 {CHALLENGE_FRIEND_SCORE_QUERY_LIMIT}명</span>만 점수에 반영됩니다. 전체 랭킹이 아닙니다.
            </p>
          ) : null}
          {scoresError ? (
            <p className="mt-3 text-sm text-rose-300/90">점수를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>
          ) : scoresLoading ? (
            <div className="mt-3 h-16 animate-pulse rounded-lg bg-white/5" aria-hidden />
          ) : (
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p>
                내 최고:{" "}
                <span className="font-mono font-bold text-white">{myBest != null ? `${myBest}점` : "기록 없음"}</span>
              </p>
              {friendRows.length === 0 ? (
                <p className="text-slate-400">수락된 친구가 없으면 여기는 비어 있어요.</p>
              ) : friendWithScore.length === 0 ? (
                <p className="text-slate-400">친구들의 PK 기록이 아직 없어요. 초대 링크를 보내 보세요.</p>
              ) : topFriend?.best != null ? (
                <p>
                  친구 중 최고:{" "}
                  <span className="font-mono font-semibold text-indigo-100">
                    {shortUid(topFriend.uid)} · {topFriend.best}점
                  </span>
                </p>
              ) : null}
              {friendRows.length > 0 && friendWithScore.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs text-slate-400">
                  {friendRows.slice(0, 5).map((row) => (
                    <li key={row.uid} className="flex justify-between gap-2">
                      <span className="truncate">{shortUid(row.uid)}</span>
                      <span className="shrink-0 font-mono">{row.best != null ? `${row.best}점` : "—"}</span>
                    </li>
                  ))}
                  {friendRows.length > 5 ? <li className="text-slate-500">외 {friendRows.length - 5}명</li> : null}
                </ul>
              ) : null}
            </div>
          )}
        </section>

        <p className="text-center text-[11px] text-slate-600">
          템플릿 시드: <code className="text-slate-500">npm run seed:pr9-template:production</code>
        </p>

        <p className="text-center text-[11px] text-slate-600">
          베타 미니슛 필드는{" "}
          <Link to="/playground/mini-shot" className="text-indigo-400 underline-offset-2 hover:underline">
            여기
          </Link>
        </p>
      </main>
    </div>
  );
}
