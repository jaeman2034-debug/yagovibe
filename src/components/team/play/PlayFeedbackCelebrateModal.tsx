import { useMemo } from "react";
import type { PlayFeedbackSubmitSummary } from "@/types/playMatchFeedback";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import { PLAY_STAT_LABELS_KO, PLAY_STAT_KEYS, sortPlayersByOVR } from "@/utils/playerStats";

type Props = {
  open: boolean;
  onClose: () => void;
  summary: PlayFeedbackSubmitSummary;
  /** 제출 직전 OVR 랭킹(1기반) */
  rankBefore: number | null;
  memberId: string;
  /** 실시간 갱신된 로스터 — 랭킹 변동 표시용 */
  players: readonly PlayPlayerStatsDoc[];
};

const MOOD_KO: Record<string, string> = {
  good: "좋음",
  normal: "보통",
  bad: "아쉬움",
};

export default function PlayFeedbackCelebrateModal({
  open,
  onClose,
  summary,
  rankBefore,
  memberId,
  players,
}: Props) {
  const rankAfter = useMemo(() => {
    const sorted = sortPlayersByOVR(players);
    const idx = sorted.findIndex((p) => p.memberId === memberId);
    return idx >= 0 ? idx + 1 : null;
  }, [players, memberId]);

  if (!open) return null;

  const statLines = PLAY_STAT_KEYS.map((k) => {
    const d = summary.growth[k];
    if (d === undefined || d === 0) return null;
    return (
      <li key={k} className="flex justify-between text-sm">
        <span className="text-gray-600">{PLAY_STAT_LABELS_KO[k]}</span>
        <span className="font-bold text-indigo-700">+{d}</span>
      </li>
    );
  }).filter(Boolean);

  const rankLine =
    rankBefore != null && rankAfter != null && rankBefore !== rankAfter ? (
      <p className="mt-2 text-center text-sm font-bold text-violet-900">
        팀 OVR 랭킹 {rankBefore}위 → {rankAfter}위 {rankAfter < rankBefore ? "🔼" : "🔽"}
      </p>
    ) : rankBefore != null && rankAfter != null ? (
      <p className="mt-2 text-center text-sm text-gray-600">팀 OVR 랭킹 {rankAfter}위 유지</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-gray-950/60 backdrop-blur-[2px]" aria-label="닫기" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[121] w-full max-w-md overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50 via-white to-indigo-50 p-6 shadow-2xl"
      >
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">이번 경기 결과</p>
        <h3 className="mt-2 text-center text-2xl font-black text-gray-900">카드가 강해졌어요</h3>
        <p className="mt-1 text-center text-xs text-gray-600">
          선택: {MOOD_KO[summary.moodPersisted] ?? summary.moodPersisted}
        </p>

        <div className="mt-5 rounded-2xl border border-indigo-100 bg-white/90 p-4 shadow-inner">
          <div className="flex items-end justify-center gap-6">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-gray-500">OVR</p>
              <p className="text-3xl font-black tabular-nums text-gray-400 line-through decoration-2">
                {summary.prevOvr}
              </p>
            </div>
            <p className="pb-2 text-2xl font-black text-indigo-600">→</p>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-indigo-600">OVR</p>
              <p className="text-4xl font-black tabular-nums text-indigo-900">{summary.nextOvr}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-6 text-xs text-gray-600">
            <span>
              EXP {summary.prevExp} → <strong className="text-indigo-800">{summary.nextExp}</strong> (+
              {summary.expDelta})
            </span>
            {summary.prevLevel !== summary.nextLevel && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-950">
                Lv.{summary.prevLevel} → Lv.{summary.nextLevel}
              </span>
            )}
          </div>
          {rankLine}
          {statLines.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-gray-100 pt-3">{statLines}</ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 py-3 text-sm font-bold text-white shadow-lg hover:from-indigo-500 hover:to-violet-600"
        >
          좋아요!
        </button>
      </div>
    </div>
  );
}
