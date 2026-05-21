import { Share2 } from "lucide-react";
import { toast } from "sonner";
import type { TeamPlayerStatsUI } from "@/types/teamPlayerStats";
import { usePlayMatchFeedbackRecap } from "@/hooks/usePlayMatchFeedbackRecap";

type Props = {
  teamId: string;
  matchId: string;
  teamName?: string;
  rankedPlayers: readonly TeamPlayerStatsUI[];
};

export default function PlayMatchRecapShare({ teamId, matchId, teamName, rankedPlayers }: Props) {
  const { loading, submittedCount, shareTitle, shareBodyWithLink, fairnessScore, rosterMvpName } =
    usePlayMatchFeedbackRecap(teamId, matchId, rankedPlayers);

  const onShare = async () => {
    if (!shareBodyWithLink?.trim()) {
      toast.message("먼저 팀원이 피드를 남겨야 요약할 수 있어요.");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: shareTitle + (teamName ? ` · ${teamName}` : ""),
          text: shareBodyWithLink,
        });
        return;
      }
      await navigator.clipboard.writeText(shareBodyWithLink);
      toast.success("요약 텍스트를 복사했어요.");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareBodyWithLink);
        toast.success("요약 텍스트를 복사했어요.");
      } catch {
        toast.error("공유에 실패했어요.");
      }
    }
  };

  if (loading && submittedCount === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-violet-200/80 bg-white/90 p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black text-violet-950">팀 결과 공유</p>
          <p className="mt-0.5 text-[11px] text-gray-600">
            제출 {submittedCount}건 기준 · MVP·성장·분위기 지수를 한 번에 보내요.
          </p>
          {(rosterMvpName || fairnessScore != null) && (
            <p className="mt-1 text-[11px] font-semibold text-violet-800">
              {rosterMvpName ? <>팀 MVP {rosterMvpName}</> : null}
              {rosterMvpName && fairnessScore != null ? " · " : null}
              {fairnessScore != null ? <>분위기 {fairnessScore}점</> : null}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void onShare()}
          disabled={submittedCount === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          카톡·문자 등으로 공유
        </button>
      </div>
      <p className="mt-2 text-[10px] text-gray-400">
        OS 공유창 또는 클립보드 복사로 전달합니다. (카카오톡 앱은 디바이스 공유 메뉴에서 선택 가능)
      </p>
    </div>
  );
}
