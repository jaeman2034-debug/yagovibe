import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarPlus, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createScheduledMatch,
  countActiveTeamMembersForRsvp,
  getMyParticipantStatus,
  getUnrespondedCount,
  getUpcomingScheduledMatches,
  respondToScheduledMatch,
} from "@/services/scheduledMatchService";
import type { RSVPStatus, ScheduledMatch, ScheduledMatchVisibility } from "@/types/scheduledMatch";

export type TeamScheduledMatchesSectionProps = {
  teamId: string;
  isActiveMember: boolean;
  /** 팀장·운영진 — 일정 생성 */
  canCreateSchedule: boolean;
  userId: string | null;
  dark?: boolean;
};

export type TeamScheduledMatchesSectionHandle = {
  openCreateDialog: () => void;
  /** 공개 허브 상단 CTA 등 — 일정·RSVP 블록으로 스크롤 (부모 `overflow-hidden`에서도 동작하도록 window 스크롤) */
  scrollSectionIntoView: () => void;
};

function formatStart(m: ScheduledMatch): string {
  try {
    return format(m.startAt.toDate(), "M월 d일 (EEE) HH:mm", { locale: ko });
  } catch {
    return "";
  }
}

export const TeamScheduledMatchesSection = forwardRef<
  TeamScheduledMatchesSectionHandle,
  TeamScheduledMatchesSectionProps
>(function TeamScheduledMatchesSection(
  { teamId, isActiveMember, canCreateSchedule, userId, dark = false },
  ref
) {
  const [rows, setRows] = useState<ScheduledMatch[]>([]);
  const [myByFixture, setMyByFixture] = useState<Record<string, RSVPStatus | null>>({});
  const [loading, setLoading] = useState(true);
  const [busyFixture, setBusyFixture] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [visibility, setVisibility] = useState<ScheduledMatchVisibility>("public");
  /** 운영진 nudge용 — null이면 비표시(비운영진 또는 조회 실패) */
  const [staffActiveMemberCount, setStaffActiveMemberCount] = useState<number | null>(null);
  const sectionRootRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const tid = teamId.trim();
    if (!tid) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getUpcomingScheduledMatches(tid, { forActiveMember: isActiveMember, limit: 20 });
      setRows(list);
      if (canCreateSchedule) {
        try {
          /** fixture마다 스캔하지 않음 — 섹션 로드당 1회, 운영진 nudge용 */
          const c = await countActiveTeamMembersForRsvp(tid);
          setStaffActiveMemberCount(c);
        } catch (err) {
          console.error("[TeamScheduledMatchesSection] active member count", err);
          setStaffActiveMemberCount(null);
        }
      } else {
        setStaffActiveMemberCount(null);
      }
      if (isActiveMember && userId) {
        const entries = await Promise.all(
          list.map(async (m) => [m.id, await getMyParticipantStatus(tid, m.id, userId)] as const)
        );
        setMyByFixture(Object.fromEntries(entries));
      } else {
        setMyByFixture({});
      }
    } catch (e) {
      console.error("[TeamScheduledMatchesSection] load", e);
      toast.error("일정을 불러오지 못했어요.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, isActiveMember, userId, canCreateSchedule]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setStartLocal(local);
    setTitle("");
    setLocation("");
    setDescription("");
    setVisibility("public");
    setDialogOpen(true);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      openCreateDialog: openCreate,
      scrollSectionIntoView: () => {
        const el = sectionRootRef.current;
        if (!el) return;
        const headerOffset = 96;
        requestAnimationFrame(() => {
          const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        });
      },
    }),
    [openCreate]
  );

  const submitCreate = async () => {
    if (!userId || !canCreateSchedule) return;
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) {
      toast.error("시작 일시를 확인해 주세요.");
      return;
    }
    if (!title.trim()) {
      toast.error("제목을 입력해 주세요.");
      return;
    }
    if (!location.trim()) {
      toast.error("장소를 입력해 주세요.");
      return;
    }
    setCreateBusy(true);
    const t = toast.loading("일정을 등록하는 중…");
    try {
      await createScheduledMatch(teamId, userId, {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        startAt: start,
        visibility,
      });
      toast.dismiss(t);
      toast.success("일정을 등록했어요.");
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "등록에 실패했어요.");
      console.error("[TeamScheduledMatchesSection] create", e);
    } finally {
      setCreateBusy(false);
    }
  };

  const onRsvp = async (fixtureId: string, status: RSVPStatus) => {
    if (!userId || !isActiveMember) {
      toast.error("팀원만 참석 여부를 등록할 수 있어요.");
      return;
    }
    setBusyFixture(fixtureId);
    try {
      await respondToScheduledMatch(teamId, fixtureId, userId, status);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "반영에 실패했어요.");
      console.error("[TeamScheduledMatchesSection] rsvp", e);
    } finally {
      setBusyFixture(null);
    }
  };

  return (
    <>
      <div ref={sectionRootRef} id="team-hub-schedule" className="scroll-mt-24">
        <Card
          className={cn(
            "mb-6",
            dark && "border-slate-600 bg-slate-900/40 text-slate-100 shadow-md"
          )}
        >
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className={cn("text-base font-semibold", dark ? "text-slate-100" : "text-gray-900")}>
            다가오는 팀 일정
          </CardTitle>
          {canCreateSchedule && userId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "gap-1.5",
                dark ? "border-slate-500 text-slate-100 hover:bg-slate-800" : ""
              )}
              onClick={openCreate}
            >
              <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
              일정 추가
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm opacity-80">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              불러오는 중…
            </div>
          ) : rows.length === 0 ? (
            <p className={cn("py-6 text-center text-sm", dark ? "text-slate-400" : "text-gray-500")}>
              예정된 일정이 없어요.
              {canCreateSchedule ? " 운영진이 일정을 추가하면 여기에 표시됩니다." : ""}
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((m) => {
                const mine = userId ? myByFixture[m.id] : null;
                const busy = busyFixture === m.id;
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "rounded-lg border p-4",
                      dark ? "border-slate-600/80 bg-slate-800/30" : "border-gray-200 bg-white/90"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold leading-snug">{m.title}</span>
                          {m.visibility === "team" ? (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
                              )}
                            >
                              팀원만
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                dark ? "bg-emerald-900/50 text-emerald-200" : "bg-emerald-50 text-emerald-800"
                              )}
                            >
                              공개
                            </span>
                          )}
                        </div>
                        <p className={cn("mt-1 text-sm", dark ? "text-slate-300" : "text-gray-600")}>
                          {formatStart(m)}
                        </p>
                        {m.location ? (
                          <p
                            className={cn(
                              "mt-1 flex items-start gap-1 text-sm",
                              dark ? "text-slate-400" : "text-gray-500"
                            )}
                          >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                            <span>{m.location}</span>
                          </p>
                        ) : null}
                        {m.description ? (
                          <p className={cn("mt-2 whitespace-pre-line text-sm", dark ? "text-slate-400" : "text-gray-600")}>
                            {m.description}
                          </p>
                        ) : null}
                        <p className={cn("mt-2 text-xs", dark ? "text-slate-500" : "text-gray-500")}>
                          참석 {m.goingCount} · 미정 {m.maybeCount} · 불참 {m.noCount}
                        </p>
                        {canCreateSchedule && staffActiveMemberCount !== null ? (() => {
                          const un = getUnrespondedCount(staffActiveMemberCount, m);
                          if (un <= 0) return null;
                          return (
                            <p
                              className={cn(
                                "mt-1.5 text-xs font-semibold",
                                dark ? "text-amber-200/95" : "text-amber-800"
                              )}
                              role="status"
                              aria-label={`아직 ${un}명이 참석 여부에 응답하지 않았습니다.`}
                            >
                              <span className="mr-0.5" aria-hidden>
                                ⚠
                              </span>
                              {un}명 미응답
                            </p>
                          );
                        })() : null}
                      </div>
                    </div>
                    {isActiveMember && userId ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 border-inherit">
                        <span className={cn("mr-1 text-xs font-medium self-center", dark ? "text-slate-400" : "text-gray-500")}>
                          내 응답
                          {mine ? (
                            <span className="ml-1 text-indigo-600 dark:text-indigo-300">
                              {mine === "going" ? "참석" : mine === "maybe" ? "미정" : "불참"}
                            </span>
                          ) : (
                            <span className="ml-1 opacity-80">없음</span>
                          )}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant={mine === "going" ? "default" : "outline"}
                          disabled={busy}
                          className={cn("text-xs", dark && mine !== "going" ? "border-slate-500" : "")}
                          onClick={() => void onRsvp(m.id, "going")}
                        >
                          참석
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={mine === "maybe" ? "default" : "outline"}
                          disabled={busy}
                          className={cn("text-xs", dark && mine !== "maybe" ? "border-slate-500" : "")}
                          onClick={() => void onRsvp(m.id, "maybe")}
                        >
                          미정
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={mine === "no" ? "default" : "outline"}
                          disabled={busy}
                          className={cn("text-xs", dark && mine !== "no" ? "border-slate-500" : "")}
                          onClick={() => void onRsvp(m.id, "no")}
                        >
                          불참
                        </Button>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin self-center opacity-70" aria-hidden /> : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>팀 일정 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="sch-title">제목</Label>
              <Input
                id="sch-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 토요일 저녁 풋살"
                maxLength={200}
                disabled={createBusy}
              />
            </div>
            <div>
              <Label htmlFor="sch-loc">장소</Label>
              <Input
                id="sch-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 잠실 풋살장"
                maxLength={500}
                disabled={createBusy}
              />
            </div>
            <div>
              <Label htmlFor="sch-start">시작</Label>
              <Input
                id="sch-start"
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                disabled={createBusy}
              />
            </div>
            <div>
              <Label htmlFor="sch-desc">설명 (선택)</Label>
              <Textarea
                id="sch-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                disabled={createBusy}
              />
            </div>
            <div>
              <Label>공개 범위</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={visibility === "public" ? "default" : "outline"}
                  onClick={() => setVisibility("public")}
                  disabled={createBusy}
                >
                  공개
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={visibility === "team" ? "default" : "outline"}
                  onClick={() => setVisibility("team")}
                  disabled={createBusy}
                >
                  팀원만
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={createBusy}>
              취소
            </Button>
            <Button type="button" onClick={() => void submitCreate()} disabled={createBusy}>
              {createBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

TeamScheduledMatchesSection.displayName = "TeamScheduledMatchesSection";
