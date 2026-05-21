import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamPublicStaffMember } from "@/types/teamPublicStaff";

export type TeamPublicStaffShowcaseProps = {
  staff: TeamPublicStaffMember[];
  dark?: boolean;
};

/**
 * 공개 팀 허브 — 회장 카드 아래, 브랜딩용 공개 운영진(직책 자유 표기).
 */
export function TeamPublicStaffShowcase({ staff, dark = false }: TeamPublicStaffShowcaseProps) {
  const visible = staff.filter((s) => s.visible);
  if (!visible.length) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border p-5 shadow-lg sm:p-6",
        dark
          ? "border-slate-600/70 bg-gradient-to-b from-slate-800/90 to-slate-900/85 text-slate-100"
          : "border-gray-200/90 bg-gradient-to-b from-white to-slate-50/90 text-gray-900"
      )}
      aria-label="공개 운영진 소개"
    >
      <div className="flex items-center gap-2">
        <Users className={cn("h-5 w-5 shrink-0", dark ? "text-slate-300" : "text-gray-600")} aria-hidden />
        <h2 className={cn("text-base font-bold tracking-tight", dark ? "text-slate-50" : "text-gray-900")}>
          운영진 소개
        </h2>
      </div>
      <p className={cn("mt-1.5 max-w-xl text-xs leading-relaxed sm:text-sm", dark ? "text-slate-400" : "text-gray-500")}>
        팀 운영을 함께하는 멤버입니다. 가입 문의는 팀 참여 버튼을 이용해 주세요.
      </p>

      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {visible.map((r) => (
          <li
            key={r.id}
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
                  {r.name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-base font-bold leading-tight sm:text-lg">{r.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    dark ? "bg-violet-900/55 text-violet-100" : "bg-indigo-100 text-indigo-900"
                  )}
                >
                  {r.title}
                </span>
              </div>
              {r.intro ? (
                <p className={cn("text-sm leading-snug sm:text-[15px]", dark ? "text-slate-300" : "text-gray-600")}>
                  {r.intro}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
