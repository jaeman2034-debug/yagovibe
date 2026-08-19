import { OrganizationMemberCard } from "@/components/federation/organization/OrganizationMemberCard";
import type {
  FederationOrganizationGroup,
  FederationOrganizationMember,
} from "@/types/federationOrganization";

export type OrganizationGroupVariant = "leadership" | "department";

export type OrganizationGroupProps = {
  group: FederationOrganizationGroup;
  onSelectMember?: (member: FederationOrganizationMember) => void;
  /** leadership: 상단 섹션 / department: 본부 컨테이너 카드 */
  variant?: OrganizationGroupVariant;
  /** leadership 단독 렌더 시 제목 영역 스타일 (회장|수석부회장 페어용) */
  embedded?: boolean;
};

/**
 * leadership — 협회장·수석부회장·사무국
 * department — 경기본부 등 (Card + 내부 임원 가로 그리드)
 */
export function OrganizationGroup({
  group,
  onSelectMember,
  variant = "department",
  embedded = false,
}: OrganizationGroupProps) {
  if (!group.members.length) return null;

  if (variant === "leadership") {
    const memberGrid =
      group.members.length === 1
        ? "grid-cols-1"
        : "grid-cols-1 sm:grid-cols-2";

    return (
      <section
        className={
          embedded
            ? "flex h-full w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
            : "w-full space-y-3"
        }
        aria-labelledby={`org-group-${group.id}`}
      >
        {embedded ? (
          <h3
            id={`org-group-${group.id}`}
            className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-900"
          >
            {group.title}
          </h3>
        ) : (
          <div className="flex w-full items-center gap-3">
            <h3
              id={`org-group-${group.id}`}
              className="shrink-0 text-base font-bold text-gray-900 md:text-lg"
            >
              {group.title}
            </h3>
            <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
          </div>
        )}
        <div className={`grid w-full gap-3 ${memberGrid}`}>
          {group.members.map((member) => (
            <OrganizationMemberCard
              key={member.id}
              member={member}
              onSelect={onSelectMember}
              showDepartment={false}
              compact={embedded}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex h-full w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
      aria-labelledby={`org-group-${group.id}`}
    >
      <h3
        id={`org-group-${group.id}`}
        className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-900"
      >
        {group.title}
      </h3>
      {/* 본부 내부 임원: Desktop·Mobile 모두 항상 2열 */}
      <div className="grid w-full grid-cols-2 gap-2 sm:gap-3">
        {group.members.map((member) => (
          <OrganizationMemberCard
            key={member.id}
            member={member}
            onSelect={onSelectMember}
            compact
            showDepartment={false}
          />
        ))}
      </div>
    </section>
  );
}
