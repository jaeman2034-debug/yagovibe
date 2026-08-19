import { useEffect, useMemo, useState } from "react";
import type { FederationOrganizationMember } from "@/types/federationOrganization";
import { NOWON_ORG_DEPARTMENT_ORDER } from "@/lib/federation/nowonOrganizationCatalog";

export type OrganizationMemberCardProps = {
  member: FederationOrganizationMember;
  onSelect?: (member: FederationOrganizationMember) => void;
  /** 본부 카드 내부용 — 패딩·보더 축소 */
  compact?: boolean;
  /** 부서명 표시 (본부 카드 안에서는 보통 false) */
  showDepartment?: boolean;
};

function initials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 1);
}

function departmentLabel(department: string): string {
  return NOWON_ORG_DEPARTMENT_ORDER.find((d) => d.id === department)?.title || "";
}

function Avatar({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 font-semibold text-slate-500 ${
        compact ? "text-sm" : "text-base md:text-lg"
      }`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

/**
 * Firestore → PHOTO_MAP → Avatar
 * onError 시 다음 소스, 모두 실패하면 Avatar
 */
export function OrganizationMemberPhoto({
  member,
  className = "h-full w-full object-cover",
  compact,
}: {
  member: FederationOrganizationMember;
  className?: string;
  compact?: boolean;
}) {
  const sources = useMemo(() => {
    const list = Array.isArray(member.photoSources) ? member.photoSources.filter(Boolean) : [];
    if (member.photo && !list.includes(member.photo)) {
      return [member.photo, ...list];
    }
    return list.length ? list : member.photo ? [member.photo] : [];
  }, [member.photo, member.photoSources]);

  const [index, setIndex] = useState(0);
  const exhausted = index >= sources.length;

  useEffect(() => {
    setIndex(0);
  }, [member.id, sources.join("|")]);

  if (!sources.length || exhausted) {
    return <Avatar name={member.name} compact={compact} />;
  }

  const src = sources[index];

  return (
    <img
      key={src}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        setIndex((i) => i + 1);
      }}
    />
  );
}

/** 가로형 프로필 — 왼쪽 사진 / 오른쪽 이름·직책 */
export function OrganizationMemberCard({
  member,
  onSelect,
  compact = false,
  showDepartment = true,
}: OrganizationMemberCardProps) {
  const dept = showDepartment ? departmentLabel(member.department) : "";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(member)}
      className={
        compact
          ? "group flex h-[72px] w-full min-w-0 items-center rounded-lg border border-gray-100 bg-gray-50/80 p-2 text-left transition hover:border-gray-200 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 sm:h-20 sm:p-2.5"
          : "group flex h-full min-h-[72px] w-full items-center rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 md:min-h-[88px] md:p-4"
      }
      aria-label={`${member.name} ${member.position} 상세`}
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <div
          className={
            compact
              ? "h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-100 sm:h-14 sm:w-14"
              : "h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-100 md:h-16 md:w-16 lg:h-[72px] lg:w-[72px]"
          }
        >
          <OrganizationMemberPhoto member={member} compact={compact} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p
            className={
              compact
                ? "truncate text-xs font-semibold text-gray-900 sm:text-sm"
                : "truncate text-sm font-semibold text-gray-900 md:text-base"
            }
          >
            {member.name}
          </p>
          <p
            className={
              compact
                ? "mt-0.5 truncate text-[11px] leading-snug text-gray-600 sm:text-xs"
                : "mt-0.5 line-clamp-2 text-xs leading-snug text-gray-600 md:text-sm"
            }
          >
            {member.position}
          </p>
          {dept ? (
            <p className="mt-0.5 hidden truncate text-[11px] text-gray-400 sm:block md:text-xs">
              {dept}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
