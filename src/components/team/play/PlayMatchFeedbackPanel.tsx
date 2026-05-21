import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MatchFeedbackMood } from "@/types/teamPlayerStats";
import type { PlayFeedbackSubmitSummary } from "@/types/playMatchFeedback";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import { submitPlayMatchFeedback } from "@/services/matchPlayFeedbackService";
import { usePlayMatchFeedbackStatus } from "@/hooks/usePlayMatchFeedbackStatus";
import { TRACK } from "@/lib/analytics";
import type { TeamPlayPageViewSource } from "@/lib/team/teamPlayRoutes";
import { dispatchTeamPlayHudReveal } from "@/lib/team/teamPlayHudEvents";
import { buildTeamPlayHudRevealFromFeedbackSummary } from "@/lib/team/buildTeamPlayHudRevealFromFeedback";
import PlayFeedbackCelebrateModal from "./PlayFeedbackCelebrateModal";

type Props = {
  teamId: string;
  memberId: string;
  userId: string;
  /** `team_games` 문서 ID */
  matchId: string;
  rankBefore: number | null;
  players: readonly PlayPlayerStatsDoc[];
  /** HUD `recentMatchLine` 등에 쓸 짧은 경기 맥락 (예: `formatTeamGameLabel`) */
  matchHudContextLine?: string;
  /** `FEEDBACK_SUBMIT` 분석 — 플레이 화면 진입 유형과 동일 스키마 */
  feedbackSource: TeamPlayPageViewSource;
  /** 피드백 블록 아래 MVP 패널 노출 여부 — 완료 후 앵커 링크용 */
  hasMvpPanelBelow?: boolean;
};

const MOOD_DONE_KO: Record<string, string> = {
  good: "좋음",
  normal: "보통",
  bad: "아쉬움",
};

export default function PlayMatchFeedbackPanel({
  teamId,
  memberId,
  userId,
  matchId,
  rankBefore,
  players,
  matchHudContextLine,
  feedbackSource,
  hasMvpPanelBelow = false,
}: Props) {
  const [busyMood, setBusyMood] = useState<MatchFeedbackMood | null>(null);
  const [celebrate, setCelebrate] = useState<PlayFeedbackSubmitSummary | null>(null);
  /** 제출 직후 숫자 칩용 (새로고침 시 없음 — OVR은 Firestore 피드백 문서에 없음) */
  const [lastSubmitSummary, setLastSubmitSummary] = useState<PlayFeedbackSubmitSummary | null>(null);
  const { submitted, data, loading: statusLoading } = usePlayMatchFeedbackStatus(teamId, matchId, memberId);

  useEffect(() => {
    setLastSubmitSummary(null);
  }, [matchId, memberId]);

  const onPick = async (mood: MatchFeedbackMood) => {
    if (!memberId || !matchId || !userId || busyMood || submitted) return;
    setBusyMood(mood);
    try {
      const summary = await submitPlayMatchFeedback({ teamId, matchId, memberId, userId, mood });
      setLastSubmitSummary(summary);
      setCelebrate(summary);
      TRACK("FEEDBACK_SUBMIT", {
        team_id: teamId,
        match_id: matchId,
        mood,
        source: feedbackSource,
        level_up: summary.nextLevel > summary.prevLevel,
        exp_delta: summary.expDelta,
      });
      dispatchTeamPlayHudReveal(
        buildTeamPlayHudRevealFromFeedbackSummary(summary, {
          recentMatchLine: matchHudContextLine?.trim() || undefined,
        })
      );
      toast.success("경기 피드백이 카드에 반영됐어요!");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e && typeof (e as { message: unknown }).message === "string"
            ? String((e as { message: string }).message)
            : "피드백 반영에 실패했어요.";
      toast.error(msg);
    } finally {
      setBusyMood(null);
    }
  };

  const doneMoodKo = data?.mood ? MOOD_DONE_KO[data.mood] ?? String(data.mood) : "";

  const expChip =
    typeof lastSubmitSummary?.expDelta === "number" && lastSubmitSummary.expDelta > 0
      ? lastSubmitSummary.expDelta
      : typeof data?.expDelta === "number" && data.expDelta > 0
        ? data.expDelta
        : null;
  const ovrDelta =
    lastSubmitSummary != null ? lastSubmitSummary.nextOvr - lastSubmitSummary.prevOvr : null;
  const leveledUp =
    lastSubmitSummary != null && lastSubmitSummary.nextLevel > lastSubmitSummary.prevLevel;

  return (
    <>
      {celebrate && (
        <PlayFeedbackCelebrateModal
          open
          onClose={() => setCelebrate(null)}
          summary={celebrate}
          rankBefore={rankBefore}
          memberId={memberId}
          players={players}
        />
      )}

      <section className="rounded-xl border border-violet-200/90 bg-gradient-to-br from-white to-violet-50/70 p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h3 className="text-base font-black text-gray-900">이 경기, 어떠셨나요?</h3>
          <span className="text-[11px] font-semibold text-violet-700">
            경기 종료 후 한 번만 저장 · 카드 즉시 갱신
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-gray-400" title={matchId}>
          경기 ID: {matchId.length > 12 ? `${matchId.slice(0, 10)}…` : matchId}
        </p>

        {statusLoading ? (
          <p className="mt-6 text-center text-sm text-gray-500">피드백 상태 불러오는 중…</p>
        ) : submitted ? (
          <div className="mt-5 flex flex-col rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/95 to-white px-4 py-6 text-center shadow-sm">
            <div className="flex flex-col items-center">
              <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-600" aria-hidden />
              <p className="text-lg font-black text-emerald-950">피드백 저장 완료</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-amber-800/90">
                상단 HUD에 반영됨
              </p>
              {(expChip != null || ovrDelta !== null || leveledUp) && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {expChip != null ? (
                    <span className="inline-flex items-center rounded-full border border-amber-300/90 bg-gradient-to-r from-amber-100 to-yellow-50 px-3 py-1.5 text-sm font-black tabular-nums text-amber-950 shadow-sm ring-1 ring-amber-400/30">
                      📈 EXP +{expChip}
                    </span>
                  ) : null}
                  {ovrDelta !== null ? (
                    ovrDelta > 0 ? (
                      <span className="inline-flex items-center rounded-full border border-cyan-400/80 bg-gradient-to-r from-cyan-100 to-sky-50 px-3 py-1.5 text-sm font-black tabular-nums text-cyan-950 shadow-sm ring-1 ring-cyan-400/35">
                        🔥 OVR +{ovrDelta}
                      </span>
                    ) : ovrDelta < 0 ? (
                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-bold tabular-nums text-slate-800">
                        OVR {ovrDelta}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                        OVR 유지
                      </span>
                    )
                  ) : null}
                  {leveledUp && lastSubmitSummary ? (
                    <span className="inline-flex items-center rounded-full border border-violet-400/80 bg-gradient-to-r from-violet-100 to-fuchsia-50 px-3 py-1.5 text-xs font-black tabular-nums text-violet-950 shadow-sm ring-1 ring-violet-400/35">
                      ⭐ Lv.{lastSubmitSummary.prevLevel}→{lastSubmitSummary.nextLevel}
                    </span>
                  ) : null}
                </div>
              )}
              <p className="mt-3 text-sm font-semibold text-emerald-900/90">
                {doneMoodKo ? <>선택: {doneMoodKo}</> : "이미 제출한 피드백입니다."}
              </p>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-gray-700">
              끝이 아니라 <span className="font-bold text-gray-900">다음 행동</span>이에요. MVP·내 카드를 확인하거나 다음 경기를 이어가 보세요.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {hasMvpPanelBelow ? (
                <a
                  href="#yago-play-mvp-panel"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500"
                >
                  MVP 흐름 보기
                  <ArrowDown className="h-4 w-4 opacity-90" aria-hidden />
                </a>
              ) : null}
              <a
                href="#yago-play-my-card"
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-900 hover:bg-indigo-50 ${
                  hasMvpPanelBelow ? "" : "sm:flex-1"
                }`}
              >
                내 카드·성장 확인
                <ArrowDown className="h-4 w-4 opacity-90" aria-hidden />
              </a>
              <Link
                to={`/teams/${encodeURIComponent(teamId)}/games`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                다른 경기 기록하기
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                { mood: "good" as const, label: "좋음", sub: "+EXP · 패스·체력" },
                { mood: "ok" as const, label: "보통", sub: "+EXP · 태도" },
                { mood: "bad" as const, label: "아쉬움", sub: "+EXP · 수비" },
              ] as const
            ).map((btn) => {
              const busy = busyMood === btn.mood;
              const disabled = !!busyMood;
              return (
                <button
                  key={btn.mood}
                  type="button"
                  disabled={disabled}
                  onClick={() => void onPick(btn.mood)}
                  className={`flex flex-col rounded-xl border-2 px-2 py-3 text-center transition active:scale-[0.98] disabled:opacity-60 ${
                    btn.mood === "good"
                      ? "border-emerald-300 bg-emerald-50 hover:border-emerald-500"
                      : btn.mood === "ok"
                        ? "border-amber-300 bg-amber-50 hover:border-amber-500"
                        : "border-slate-300 bg-slate-50 hover:border-slate-500"
                  }`}
                >
                  <span className="text-sm font-black text-gray-900">{busy ? "" : btn.label}</span>
                  <span className="mt-0.5 flex min-h-[2.25rem] items-center justify-center text-[10px] font-semibold leading-tight text-gray-600">
                    {busy ? <Loader2 className="h-5 w-5 animate-spin text-violet-600" /> : btn.sub}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
