import { useEffect, useState } from "react";
import { Bell, CalendarPlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getWeekScheduleKpis,
  listUnrespondedMembersThisWeekEnriched,
  sendUnrespondedRsvpCoachReminders,
  type RsvpMemberRow,
  type WeekScheduleKpis,
} from "@/services/scheduledMatchService";
import { getMediaByEntity } from "@/services/mediaService";
import { TeamRsvpOperatorModal } from "@/components/team/TeamRsvpOperatorModal";

export type TeamOperatorCoachCardProps = {
  teamId: string;
  isActiveMember: boolean;
  /** 운영진(팀장·운영)만 — 내부 운영 힌트 */
  visible: boolean;
  /** 최근 21일 이내 `team_match_history` 건수(부모에서 계산) */
  recentMatchCount21d: number;
  /** 알림 제목·푸시에 사용 */
  teamName: string;
  /** 일정 생성 다이얼로그 — `TeamScheduledMatchesSection` ref */
  onOpenScheduleCreate?: () => void;
  dark?: boolean;
};

type CoachState =
  | { status: "loading" }
  | { status: "ready"; hints: string[]; kpis: WeekScheduleKpis; mediaPhotoCount: number }
  | { status: "error" };

function buildHints(input: {
  showStaff: boolean;
  weekFixtureCount: number;
  weekGoingSum: number;
  weekUnrespondedSum: number | null;
  mediaPhotoCount: number;
  recentMatchCount21d: number;
}): string[] {
  const hints: string[] = [];
  const U = input.weekUnrespondedSum;

  if (input.showStaff && U != null && U > 5) {
    hints.push("미응답 응답이 많습니다. 한 번의 리마인드로 참여율을 높일 수 있어요.");
  }

  if (input.weekFixtureCount === 0) {
    hints.push("이번 주 일정이 없습니다. 참여율 유지를 위해 일정을 등록해 보세요.");
  } else if (input.showStaff && U != null && U > 0 && hints.length < 2) {
    hints.push(`미응답 응답이 필요한 건수가 총 ${U}건입니다. 멤버에게 한 번 더 알려 주세요.`);
  }

  if (input.mediaPhotoCount === 0 && hints.length < 2) {
    hints.push("활동 사진을 올리면 신규 문의 전환이 좋아집니다.");
  }

  if (
    input.recentMatchCount21d === 0 &&
    input.weekFixtureCount > 0 &&
    hints.length < 2
  ) {
    hints.push(
      "최근 3주 안에 등록된 경기 기록이 없어요. 대회·리그와 연결되면 공개 허브가 더 풍부해져요."
    );
  }

  if (
    input.weekFixtureCount > 0 &&
    input.weekGoingSum === 0 &&
    hints.length < 2 &&
    (U == null || U === 0)
  ) {
    hints.push("이번 주 일정은 있지만 참석 확정이 아직 없어요. 단톡·알림으로 일정을 한 번 더 알려 주세요.");
  }

  return hints.slice(0, 2);
}

/**
 * 규칙 기반 운영 코치(외부 LLM 없음). KPI 직후 · 운영진 전용.
 * 미응답 알림·일정 생성은 CTA로 연결.
 */
export function TeamOperatorCoachCard({
  teamId,
  isActiveMember,
  visible,
  recentMatchCount21d,
  teamName,
  onOpenScheduleCreate,
  dark = false,
}: TeamOperatorCoachCardProps) {
  const [state, setState] = useState<CoachState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [remindBusy, setRemindBusy] = useState(false);
  const [rsvpModalOpen, setRsvpModalOpen] = useState(false);
  const [previewMembers, setPreviewMembers] = useState<RsvpMemberRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const tid = teamId.trim();
    if (!tid) {
      setState({
        status: "ready",
        hints: [],
        kpis: { weekFixtureCount: 0, weekGoingSum: 0, weekUnrespondedSum: null },
        mediaPhotoCount: 0,
      });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      try {
        const [kpis, photos] = await Promise.all([
          getWeekScheduleKpis(tid, {
            forActiveMember: isActiveMember,
            includeStaffUnresponded: true,
          }),
          getMediaByEntity("team", tid, { type: "photo", limitCount: 8 }),
        ]);
        if (cancelled) return;
        const mediaPhotoCount = photos.filter((m) => m.type === "photo").length;
        const hints = buildHints({
          showStaff: true,
          weekFixtureCount: kpis.weekFixtureCount,
          weekGoingSum: kpis.weekGoingSum,
          weekUnrespondedSum: kpis.weekUnrespondedSum,
          mediaPhotoCount,
          recentMatchCount21d,
        });
        setState({ status: "ready", hints, kpis, mediaPhotoCount });
      } catch (e) {
        console.error("[TeamOperatorCoachCard]", e);
        if (!cancelled) setState({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, isActiveMember, visible, recentMatchCount21d, refreshKey]);

  const ready = state.status === "ready" ? state : null;
  const U = ready?.kpis.weekUnrespondedSum;
  const showRemindCta =
    Boolean(ready) && U != null && U > 0 && (ready!.kpis.weekFixtureCount ?? 0) > 0;
  const showScheduleCta =
    Boolean(ready) && ready!.kpis.weekFixtureCount === 0 && Boolean(onOpenScheduleCreate);

  useEffect(() => {
    if (!visible || !showRemindCta) {
      setPreviewMembers(null);
      setPreviewLoading(false);
      return;
    }
    const tid = teamId.trim();
    if (!tid) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewMembers(null);
    void (async () => {
      try {
        const rows = await listUnrespondedMembersThisWeekEnriched(tid, { forActiveMember: isActiveMember });
        if (!cancelled) setPreviewMembers(rows);
      } catch (e) {
        console.error("[TeamOperatorCoachCard] preview", e);
        if (!cancelled) setPreviewMembers([]);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, showRemindCta, teamId, isActiveMember, refreshKey]);

  if (!visible) return null;

  if (state.status === "loading") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs",
          dark ? "border-slate-600/80 bg-slate-900/40 text-slate-300" : "border-indigo-100 bg-indigo-50/70 text-indigo-950"
        )}
        aria-busy="true"
        aria-label="운영 코치"
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin opacity-80" aria-hidden />
        운영 힌트 불러오는 중…
      </div>
    );
  }

  if (state.status === "error") {
    return null;
  }

  const { hints } = state;

  if (hints.length === 0 && !showRemindCta && !showScheduleCta) {
    return null;
  }

  const onRemind = async () => {
    const tid = teamId.trim();
    if (!tid) return;
    setRemindBusy(true);
    const t = toast.loading("알림을 보내는 중…");
    try {
      const { recipientCount } = await sendUnrespondedRsvpCoachReminders({
        teamId: tid,
        teamName: teamName.trim() || "팀",
        forActiveMember: isActiveMember,
      });
      toast.dismiss(t);
      if (recipientCount === 0) {
        toast.message("지금 보낼 미응답 멤버가 없어요.", {
          description: "RSVP를 아직 안 한 멤버만 알림이 갑니다.",
        });
      } else {
        toast.success(`알림을 ${recipientCount}명에게 보냈어요.`, {
          description: "앱 알림·푸시(등록된 경우)로 전달됩니다.",
        });
        setRefreshKey((k) => k + 1);
      }
    } catch (e) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "알림 전송에 실패했어요.");
    } finally {
      setRemindBusy(false);
    }
  };

  const previewSlice = previewMembers?.slice(0, 3) ?? [];
  const previewRest =
    previewMembers && previewMembers.length > 3 ? previewMembers.length - 3 : 0;

  return (
    <>
      <section
        className={cn(
          "w-full rounded-xl border px-4 py-3.5 shadow-sm sm:px-5 sm:py-4",
          dark
            ? "border-violet-500/35 bg-gradient-to-r from-violet-950/50 to-slate-900/60 text-slate-100"
            : "border-indigo-200/90 bg-gradient-to-r from-indigo-50/95 to-violet-50/80 text-indigo-950"
        )}
        aria-label="AI 운영 코치"
      >
        <div className="flex items-center gap-2">
          <Sparkles className={cn("h-4 w-4 shrink-0", dark ? "text-violet-300" : "text-violet-600")} aria-hidden />
          <h2 className={cn("text-xs font-bold uppercase tracking-wide", dark ? "text-violet-200" : "text-violet-800")}>
            운영 코치
          </h2>
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
              dark ? "bg-white/10 text-slate-300" : "bg-white/80 text-indigo-700"
            )}
          >
            규칙 기반
          </span>
        </div>
        {hints.length > 0 ? (
          <ul className="mt-2.5 space-y-2 text-sm leading-snug sm:text-[15px]">
            {hints.map((line, i) => (
              <li key={i} className={cn("flex gap-2", dark ? "text-slate-100" : "text-gray-900")}>
                <span className="shrink-0 font-bold text-violet-500 dark:text-violet-300" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {(showRemindCta || showScheduleCta) && (
          <div
            className={cn(
              "mt-3 space-y-3",
              hints.length > 0 ? "border-t pt-3" : "pt-1",
              dark ? "border-slate-600/60" : "border-indigo-100/90"
            )}
          >
            {showRemindCta ? (
              <div className="space-y-2">
                <p className={cn("text-[11px] font-semibold uppercase tracking-wide", dark ? "text-slate-400" : "text-gray-500")}>
                  미응답 멤버
                </p>
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    불러오는 중…
                  </div>
                ) : previewMembers && previewMembers.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex -space-x-2">
                      {previewSlice.map((m) => (
                        <div
                          key={m.uid}
                          className={cn(
                            "relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2",
                            dark ? "ring-slate-900" : "ring-white"
                          )}
                          title={m.displayName}
                        >
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span
                              className={cn(
                                "flex h-full w-full items-center justify-center text-xs font-bold",
                                dark ? "bg-slate-700 text-slate-100" : "bg-indigo-100 text-indigo-800"
                              )}
                            >
                              {m.displayName.slice(0, 1)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
                      <span className={cn("font-medium", dark ? "text-slate-100" : "text-gray-900")}>
                        {previewSlice.map((m) => m.displayName).join(", ")}
                      </span>
                      {previewRest > 0 ? (
                        <span className={cn("ml-1 font-semibold", dark ? "text-violet-300" : "text-violet-700")}>
                          외 {previewRest}명
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className={cn("text-xs", dark ? "text-slate-500" : "text-gray-500")}>
                    미응답 멤버 목록을 불러오지 못했어요.「전체 보기」에서 일정별로 확인해 주세요.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {showRemindCta ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-9 text-xs font-semibold",
                      dark ? "border-slate-500 text-slate-100 hover:bg-white/10" : "border-indigo-300 text-indigo-900"
                    )}
                    onClick={() => setRsvpModalOpen(true)}
                  >
                    전체 보기
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={remindBusy}
                    className={cn(
                      "h-9 gap-1.5 text-xs font-semibold",
                      dark
                        ? "bg-violet-600 text-white hover:bg-violet-500"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    )}
                    onClick={() => void onRemind()}
                  >
                    {remindBusy ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    미응답 멤버 알림 보내기
                  </Button>
                </>
              ) : null}
              {showScheduleCta ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-9 gap-1.5 text-xs font-semibold",
                    dark ? "border-slate-500 text-slate-100 hover:bg-white/10" : "border-indigo-300 text-indigo-900"
                  )}
                  onClick={() => onOpenScheduleCreate?.()}
                >
                  <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  일정 만들기
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <TeamRsvpOperatorModal
        open={rsvpModalOpen}
        onOpenChange={setRsvpModalOpen}
        teamId={teamId.trim()}
        isActiveMember={isActiveMember}
        dark={dark}
      />
    </>
  );
}
