import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamPublicStaffMember } from "@/types/teamPublicStaff";
import {
  getVisibleTeamPublicStaff,
  groupTeamPublicStaffByRole,
  type TeamPublicStaffRoleGroup,
} from "@/lib/team/resolveTeamPublicStaff";

export type TeamStaffDirectorySectionProps = {
  /** teams 문서 — `aiProfile.meta.publicStaff` 기반 */
  team: { aiProfile?: unknown } | null | undefined;
  dark?: boolean;
};

function StaffMemberRow({
  member,
  dark,
}: {
  member: TeamPublicStaffMember;
  dark: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[72px] w-full min-w-0 items-center gap-3 rounded-lg border p-2 sm:h-20 sm:p-2.5",
        dark
          ? "border-slate-600/60 bg-slate-900/40"
          : "border-gray-100 bg-gray-50/80"
      )}
    >
      <div
        className={cn(
          "h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 sm:h-14 sm:w-14",
          dark ? "bg-slate-700 ring-slate-600" : "bg-gray-100 ring-gray-100"
        )}
      >
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center text-sm font-semibold",
              dark ? "bg-slate-700 text-slate-200" : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"
            )}
            aria-hidden
          >
            {member.name.trim().slice(0, 1) || "?"}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className={cn(
            "truncate text-xs font-semibold sm:text-sm",
            dark ? "text-slate-50" : "text-gray-900"
          )}
        >
          {member.name}
        </p>
        {member.intro ? (
          <p
            className={cn(
              "mt-0.5 truncate text-[11px] leading-snug sm:text-xs",
              dark ? "text-slate-400" : "text-gray-600"
            )}
          >
            {member.intro}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** 직책 1개 = 카드 1개 (협회 본부 카드와 동일 톤, 그룹 키는 role) */
function ClubStaffRoleCard({
  group,
  dark,
}: {
  group: TeamPublicStaffRoleGroup;
  dark: boolean;
}) {
  if (!group.members.length) return null;

  return (
    <section
      className={cn(
        "flex h-full w-full flex-col rounded-xl border p-4 shadow-sm md:p-5",
        dark ? "border-slate-600/70 bg-slate-900/55" : "border-gray-200 bg-white"
      )}
      aria-labelledby={`club-staff-role-${group.roleKey}`}
    >
      <h3
        id={`club-staff-role-${group.roleKey}`}
        className={cn(
          "mb-3 border-b pb-2 text-base font-semibold",
          dark ? "border-slate-700 text-slate-50" : "border-gray-100 text-gray-900"
        )}
      >
        {group.roleLabel}
      </h3>
      <ul
        className={cn(
          "grid w-full gap-2 sm:gap-3",
          group.members.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
        )}
      >
        {group.members.map((member) => (
          <li key={member.id}>
            <StaffMemberRow member={member} dark={dark} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 공개 콘텐츠 — 운영진 소개 (읽기 전용).
 * CMS(팀 운영 모드)와 분리: 접기/펼침과 무관하게 항상 렌더.
 * publicStaff → 직책별 카드. 회장 제외. 빈 그룹 없음.
 */
export function TeamStaffDirectorySection({ team, dark = false }: TeamStaffDirectorySectionProps) {
  const groups = groupTeamPublicStaffByRole(getVisibleTeamPublicStaff(team));

  if (!groups.length) return null;

  return (
    <section
      data-public-content="staff-directory"
      className={cn(
        "rounded-2xl border p-5 shadow-lg sm:p-6",
        dark
          ? "border-slate-600/70 bg-gradient-to-b from-slate-800/90 to-slate-900/85 text-slate-100"
          : "border-gray-200/90 bg-gradient-to-b from-white to-slate-50/90 text-gray-900"
      )}
      aria-label="운영진 소개"
    >
      <div className="flex items-center gap-2">
        <Users className={cn("h-5 w-5 shrink-0", dark ? "text-slate-300" : "text-gray-600")} aria-hidden />
        <h2 className={cn("text-base font-bold tracking-tight", dark ? "text-slate-50" : "text-gray-900")}>
          운영진 소개
        </h2>
      </div>
      <p className={cn("mt-1.5 max-w-xl text-xs leading-relaxed sm:text-sm", dark ? "text-slate-400" : "text-gray-500")}>
        등록된 직책만 표시됩니다. 회장은 인사말에서 소개합니다.
      </p>

      {/* Desktop·Tablet 2열 / Mobile 1열 — 직책 카드 그리드 */}
      <div className="mt-5 grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {groups.map((group) => (
          <ClubStaffRoleCard key={group.roleKey} group={group} dark={dark} />
        ))}
      </div>
    </section>
  );
}
