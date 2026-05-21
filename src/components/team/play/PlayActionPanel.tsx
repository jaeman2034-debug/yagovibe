import { ChevronDown, Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRACK } from "@/lib/analytics";
import {
  PLAY_TAB_CTA_SCROLL_EVENT,
  type PlayTabCtaScrollDetail,
  type TeamPlayPageViewSource,
} from "@/lib/team/teamPlayRoutes";
import { cn } from "@/lib/utils";
import { mergeTeamPlayHud, type TeamPlayHudSnapshot } from "./hud/teamPlayHudTypes";

const ANCHOR_ID = "team-play-tab-anchor";

function scrollToPlayTab(detail: PlayTabCtaScrollDetail) {
  document.getElementById(ANCHOR_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PLAY_TAB_CTA_SCROLL_EVENT, { detail }));
  }
}

function trackCta(
  teamId: string,
  kind: "CTA_CLICK_RESULT" | "CTA_CLICK_PARTICIPATION",
  gameId: string,
  source: TeamPlayPageViewSource
) {
  const tid = teamId.trim();
  if (!tid) return;
  const params: Record<string, string | number | boolean> = { team_id: tid, source };
  const gid = gameId.trim();
  if (gid) params.game_id = gid;
  TRACK(kind, params);
}

export function PlayActionPanel({
  teamId,
  activeGameId = "",
  playEntrySource,
  snapshot,
  variant = "default",
}: {
  teamId: string;
  /** URL `matchId` — CTA가 어떤 경기 맥락인지 분석용 (없으면 생략) */
  activeGameId?: string;
  /** `/play` 진입 유형 — CTA 의사결정을 유입별로 분석 */
  playEntrySource: TeamPlayPageViewSource;
  snapshot?: Partial<TeamPlayHudSnapshot> | null;
  /** 라운지: 피드백 CTA를 게임 진입보다 낮은 시각적 우선순위 */
  variant?: "default" | "compact" | "lounge";
}) {
  const data = mergeTeamPlayHud(snapshot);

  const primaryLabel =
    data.streakWins >= 2
      ? `🔥 연승 이어가기 (${data.streakWins}경기)`
      : "🔥 지금 피드백 → OVR·EXP 반영";

  const secondaryLabel =
    data.mvpRank > 1
      ? `👉 MVP 순위 따라잡기 (${data.mvpLeadPoints}점 차)`
      : "👉 MVP·성장 이어가기";

  const primaryHint =
    data.streakWins >= 2
      ? "지금 기록을 안 남기면 연승 분위기가 끊길 수 있어요. 이번 경기로 이어가요."
      : "종료 경기만 고르면 됩니다. 감각 한 줄이 카드·MVP 랭킹까지 이어져요.";

  const secondaryHint =
    data.mvpRank > 1
      ? "이번 경기만 잘해도 1위를 노릴 수 있어요. 순위가 바로 바뀝니다."
      : "1위를 지키거나 추격하려면 다음 경기 피드백이 가장 큽니다.";

  const compact = variant === "compact" || variant === "lounge";
  const lounge = variant === "lounge";

  return (
    <section
      aria-label="다음 행동"
      className={cn(
        "rounded-2xl border p-3 sm:p-4",
        lounge
          ? "border-white/10 bg-black/20"
          : compact
            ? "border-white/10 bg-white/5"
            : "border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-violet-50 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-violet-950/30"
      )}
    >
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          lounge || compact ? "text-slate-400" : "text-indigo-700 dark:text-indigo-300"
        )}
      >
        팀 피드백
      </p>
      <div className="mt-2.5 flex flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <Button
            type="button"
            className={cn(
              "h-10 w-full font-bold text-white shadow-md",
              compact ? "bg-indigo-600/90 hover:bg-indigo-500" : "h-11 bg-indigo-600 hover:bg-indigo-500"
            )}
            onClick={() => {
              trackCta(teamId, "CTA_CLICK_RESULT", activeGameId, playEntrySource);
              scrollToPlayTab({ intent: "streak" });
            }}
          >
            {data.streakWins >= 2 ? (
              <Flame className="mr-2 h-4 w-4 shrink-0 text-amber-200" aria-hidden />
            ) : (
              <Sparkles className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            )}
            {primaryLabel}
          </Button>
          {!compact ? (
            <p className="px-0.5 text-[10px] font-medium leading-snug text-indigo-800/85 dark:text-indigo-200/75">
              {primaryHint}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full font-semibold",
              compact
                ? "h-9 border-white/15 bg-transparent text-slate-200 hover:bg-white/10"
                : "h-11 border-indigo-300 bg-white/80 text-indigo-900 hover:bg-white dark:border-indigo-700 dark:bg-slate-900/60 dark:text-indigo-100"
            )}
            onClick={() => {
              trackCta(teamId, "CTA_CLICK_PARTICIPATION", activeGameId, playEntrySource);
              scrollToPlayTab({ intent: "mvp" });
            }}
          >
            {secondaryLabel}
            <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </Button>
          {!compact ? (
            <p className="px-0.5 text-[10px] font-medium leading-snug text-indigo-800/85 dark:text-indigo-200/75">
              {secondaryHint}
            </p>
          ) : null}
        </div>
      </div>
      {!compact ? (
        <p className="mt-3 text-[11px] font-semibold text-indigo-900/90 dark:text-indigo-100/80">
          행동 = 보상: 피드백 → 상단 HUD 갱신 → MVP·내 카드 순서로 확인하면 됩니다.
        </p>
      ) : null}
    </section>
  );
}

export { ANCHOR_ID as TEAM_PLAY_TAB_ANCHOR_ID };
