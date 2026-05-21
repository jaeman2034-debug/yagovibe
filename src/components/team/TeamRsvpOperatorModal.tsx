import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getFixtureRsvpBreakdown,
  listUpcomingFixturesInCurrentWeek,
  type FixtureRsvpBreakdown,
  type RsvpMemberRow,
} from "@/services/scheduledMatchService";
import type { ScheduledMatch } from "@/types/scheduledMatch";

export type TeamRsvpOperatorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  isActiveMember: boolean;
  dark?: boolean;
};

function formatFixtureLabel(m: ScheduledMatch): string {
  try {
    const t = format(m.startAt.toDate(), "M/d (EEE) HH:mm", { locale: ko });
    return `${t} — ${m.title}`;
  } catch {
    return m.title;
  }
}

function MemberList({ rows, dark }: { rows: RsvpMemberRow[]; dark?: boolean }) {
  if (rows.length === 0) {
    return (
      <p className={cn("py-2 text-sm", dark ? "text-slate-500" : "text-gray-500")}>없음</p>
    );
  }
  return (
    <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
      {rows.map((m) => (
        <li key={m.uid} className="flex items-center gap-2.5 rounded-lg border px-2 py-1.5 text-sm">
          {m.photoUrl ? (
            <img src={m.photoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white",
                dark ? "bg-slate-600 text-slate-100" : "bg-indigo-100 text-indigo-800"
              )}
              aria-hidden
            >
              {m.displayName.slice(0, 1)}
            </div>
          )}
          <span className={cn("min-w-0 truncate font-medium", dark ? "text-slate-100" : "text-gray-900")}>
            {m.displayName}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  count,
  rows,
  dark,
  accent,
}: {
  title: string;
  count: number;
  rows: RsvpMemberRow[];
  dark?: boolean;
  accent: "emerald" | "amber" | "rose" | "violet";
}) {
  const accentClass =
    accent === "emerald"
      ? dark
        ? "border-emerald-800/60 bg-emerald-950/30"
        : "border-emerald-100 bg-emerald-50/80"
      : accent === "amber"
        ? dark
          ? "border-amber-800/50 bg-amber-950/25"
          : "border-amber-100 bg-amber-50/80"
        : accent === "rose"
          ? dark
            ? "border-rose-900/50 bg-rose-950/25"
            : "border-rose-100 bg-rose-50/80"
          : dark
            ? "border-violet-800/50 bg-violet-950/30"
            : "border-violet-100 bg-violet-50/80";

  return (
    <section className={cn("rounded-xl border p-3 sm:p-4", accentClass)}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={cn("text-sm font-bold", dark ? "text-slate-100" : "text-gray-900")}>{title}</h3>
        <span className={cn("tabular-nums text-xs font-semibold", dark ? "text-slate-400" : "text-gray-600")}>
          {count}명
        </span>
      </div>
      <MemberList rows={rows} dark={dark} />
    </section>
  );
}

/**
 * 운영진용 — 이번 주 일정별 RSVP 현황(참석·미정·불참·미응답)
 */
export function TeamRsvpOperatorModal({
  open,
  onOpenChange,
  teamId,
  isActiveMember,
  dark = false,
}: TeamRsvpOperatorModalProps) {
  const [fixtures, setFixtures] = useState<ScheduledMatch[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [breakdown, setBreakdown] = useState<FixtureRsvpBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tid = teamId.trim();
    if (!tid) return;
    let cancelled = false;
    setFixturesLoading(true);
    void (async () => {
      try {
        const list = await listUpcomingFixturesInCurrentWeek(tid, { forActiveMember: isActiveMember });
        if (cancelled) return;
        setFixtures(list);
        setSelectedId(list[0]?.id ?? "");
      } catch (e) {
        console.error("[TeamRsvpOperatorModal] fixtures", e);
        if (!cancelled) {
          setFixtures([]);
          setSelectedId("");
        }
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, teamId, isActiveMember]);

  useEffect(() => {
    if (!open || !selectedId) {
      setBreakdown(null);
      return;
    }
    const tid = teamId.trim();
    if (!tid) return;
    let cancelled = false;
    setBreakdownLoading(true);
    void (async () => {
      try {
        const b = await getFixtureRsvpBreakdown(tid, selectedId);
        if (!cancelled) setBreakdown(b);
      } catch (e) {
        console.error("[TeamRsvpOperatorModal] breakdown", e);
        if (!cancelled) setBreakdown(null);
      } finally {
        if (!cancelled) setBreakdownLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, teamId, selectedId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl",
          dark ? "border-slate-600 bg-slate-900 text-slate-100" : ""
        )}
      >
        <DialogHeader>
          <DialogTitle className={dark ? "text-slate-50" : undefined}>RSVP 현황</DialogTitle>
          <DialogDescription className={dark ? "text-slate-400" : undefined}>
            이번 주 일정을 선택하면 참석·미정·불참·미응답 멤버를 볼 수 있어요.
          </DialogDescription>
        </DialogHeader>

        {fixturesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin opacity-70" aria-hidden />
          </div>
        ) : fixtures.length === 0 ? (
          <p className={cn("py-4 text-center text-sm", dark ? "text-slate-400" : "text-gray-600")}>
            이번 주에 표시할 다가오는 일정이 없어요.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="rsvp-operator-fixture"
                className={cn("mb-1.5 block text-xs font-semibold", dark ? "text-slate-300" : "text-gray-700")}
              >
                일정 선택
              </label>
              <select
                id="rsvp-operator-fixture"
                className={cn(
                  "h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500",
                  dark
                    ? "border-slate-600 bg-slate-800 text-slate-100"
                    : "border-gray-300 bg-white text-gray-900"
                )}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {formatFixtureLabel(f)}
                  </option>
                ))}
              </select>
            </div>

            {breakdownLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin opacity-70" aria-hidden />
              </div>
            ) : breakdown ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Section title="참석 예정" count={breakdown.going.length} rows={breakdown.going} dark={dark} accent="emerald" />
                <Section title="미정" count={breakdown.maybe.length} rows={breakdown.maybe} dark={dark} accent="amber" />
                <Section title="불참" count={breakdown.no.length} rows={breakdown.no} dark={dark} accent="rose" />
                <Section
                  title="미응답"
                  count={breakdown.unanswered.length}
                  rows={breakdown.unanswered}
                  dark={dark}
                  accent="violet"
                />
              </div>
            ) : (
              <p className={cn("text-center text-sm", dark ? "text-slate-400" : "text-gray-600")}>
                일정 정보를 불러오지 못했어요.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
