import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPublicTeamStaffCallable, type PublicTeamStaffRow } from "@/lib/team/getPublicTeamStaffClient";

export type TeamStaffDirectorySectionProps = {
  teamId: string;
  dark?: boolean;
};

function staffBadgeClass(roleKey: string, dark: boolean): string {
  const k = roleKey.toLowerCase();
  if (k === "owner") {
    return dark
      ? "bg-violet-600/90 text-white ring-1 ring-violet-400/40"
      : "bg-violet-600 text-white ring-1 ring-violet-300/80";
  }
  if (k === "vice") {
    return dark
      ? "bg-fuchsia-900/55 text-fuchsia-100 ring-1 ring-fuchsia-400/30"
      : "bg-fuchsia-100 text-fuchsia-900 ring-1 ring-fuchsia-200/90";
  }
  if (k === "manager") {
    return dark
      ? "bg-amber-900/50 text-amber-100 ring-1 ring-amber-500/25"
      : "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90";
  }
  return dark
    ? "bg-slate-600/90 text-slate-100 ring-1 ring-slate-400/25"
    : "bg-slate-200 text-slate-900 ring-1 ring-slate-300/80";
}

/**
 * 공개 팀 허브 — 클럽 운영진(회장·부회장·운영진·총무)
 */
export function TeamStaffDirectorySection({ teamId, dark = false }: TeamStaffDirectorySectionProps) {
  const [rows, setRows] = useState<PublicTeamStaffRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tid = teamId.trim();
    if (!tid) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const staff = await getPublicTeamStaffCallable(tid);
        if (!cancelled) setRows(staff);
      } catch {
        if (!cancelled) {
          setRows([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <section
        className={cn(
          "rounded-2xl border p-5 sm:p-6",
          dark ? "border-slate-600/80 bg-slate-800/25 text-slate-200" : "border-gray-200 bg-white/95"
        )}
        aria-busy="true"
        aria-label="클럽 운영진"
      >
        <div className="flex items-center gap-2 text-sm opacity-80">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          운영진 정보를 불러오는 중…
        </div>
      </section>
    );
  }

  const showDirectoryShell = !loading && rows !== null;

  if (!showDirectoryShell) {
    return null;
  }

  const list = rows ?? [];

  return (
    <section
      className={cn(
        "rounded-2xl border p-5 shadow-lg sm:p-6",
        dark
          ? "border-slate-600/70 bg-gradient-to-b from-slate-800/90 to-slate-900/85 text-slate-100"
          : "border-gray-200/90 bg-gradient-to-b from-white to-slate-50/90 text-gray-900"
      )}
      aria-label="클럽 운영진"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className={cn("h-5 w-5 shrink-0", dark ? "text-slate-300" : "text-gray-600")} aria-hidden />
            <h2 className={cn("text-base font-bold tracking-tight", dark ? "text-slate-50" : "text-gray-900")}>
              클럽 운영진
            </h2>
          </div>
          <p className={cn("mt-1.5 max-w-xl text-xs leading-relaxed sm:text-sm", dark ? "text-slate-400" : "text-gray-500")}>
            팀 운영을 돕는 주요 멤버입니다.
          </p>
        </div>
      </div>

      {error ? (
        <p
          className={cn(
            "mt-5 rounded-xl border border-dashed px-4 py-6 text-center text-sm",
            dark ? "border-amber-700/50 bg-amber-950/20 text-amber-100/90" : "border-amber-200 bg-amber-50/80 text-amber-950"
          )}
          role="status"
        >
          운영진 목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.
        </p>
      ) : list.length === 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="운영진 목록 비어 있음">
          <li
            className={cn(
              "flex min-h-[6rem] flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center sm:col-span-2",
              dark ? "border-slate-600/80 bg-slate-900/30 text-slate-400" : "border-gray-200 bg-gray-50/90 text-gray-600"
            )}
          >
            <span className="text-sm font-semibold">표시할 운영진이 아직 없어요</span>
            <span className="text-xs leading-relaxed opacity-90">
              회장(owner)·부회장(vice)·운영진(admin)·총무(manager)로 등록된 멤버가 여기에 나타납니다.
            </span>
          </li>
        </ul>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {list.map((r) => (
            <li
              key={r.uid}
              className={cn(
                "flex gap-4 rounded-xl border p-4 sm:p-5",
                dark ? "border-slate-600/70 bg-slate-900/45 shadow-inner" : "border-gray-100 bg-white shadow-sm"
              )}
            >
              <div className="shrink-0 pt-0.5">
                {r.photoUrl ? (
                  <img
                    src={r.photoUrl}
                    alt=""
                    className={cn(
                      "h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-offset-2 sm:h-[4.5rem] sm:w-[4.5rem]",
                      dark ? "ring-violet-500/35 ring-offset-slate-900" : "ring-indigo-200/90 ring-offset-white"
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold shadow-inner ring-2 ring-offset-2 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl",
                      dark
                        ? "bg-slate-700 text-slate-100 ring-slate-500/40 ring-offset-slate-900"
                        : "bg-indigo-100 text-indigo-800 ring-indigo-200/80 ring-offset-white"
                    )}
                    aria-hidden
                  >
                    {r.displayName.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="text-base font-bold leading-tight tracking-tight sm:text-lg">{r.displayName}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      staffBadgeClass(r.roleKey, dark)
                    )}
                  >
                    {r.roleLabel}
                  </span>
                </div>
                {r.subtitle ? (
                  <p
                    className={cn(
                      "text-sm leading-snug sm:text-[15px]",
                      dark ? "text-slate-300" : "text-gray-600"
                    )}
                  >
                    {r.subtitle}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
