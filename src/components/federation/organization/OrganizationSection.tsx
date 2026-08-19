import { useMemo, useState } from "react";
import { OrganizationGroup } from "@/components/federation/organization/OrganizationGroup";
import { OrganizationMemberDetailModal } from "@/components/federation/organization/OrganizationMemberDetailModal";
import {
  groupOrganizationMembers,
  resolveOrganizationMembers,
} from "@/lib/federation/resolveFederationOrganization";
import type {
  FederationOrganizationGroup,
  FederationOrganizationMember,
  LegacyFederationExecutive,
} from "@/types/federationOrganization";

/** 회장·수석부회장만 상단 특수 2열 — 사무국 포함 나머지는 본부 Card 통일 */
const TOP_PAIR_IDS = ["president", "senior_vp"] as const;

export type OrganizationSectionProps = {
  title?: string;
  showTitle?: boolean;
  summary?: string;
  executives?: LegacyFederationExecutive[] | null;
  members?: FederationOrganizationMember[] | null;
  federationSlug?: string | null;
  chairpersonPhotoUrl?: string | null;
};

function pickGroups(
  groups: FederationOrganizationGroup[],
  ids: readonly string[]
): FederationOrganizationGroup[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as FederationOrganizationGroup[];
}

function departmentStyleGroups(
  groups: FederationOrganizationGroup[]
): FederationOrganizationGroup[] {
  const skip = new Set<string>(TOP_PAIR_IDS);
  return groups.filter((g) => !skip.has(g.id));
}

/**
 * 최종 통일 레이아웃
 * 1) 회장 | 수석부회장 — Desktop 2열 / Mobile 1열 (특수)
 * 2) 사무국 + 모든 본부 — 동일 OrganizationGroup(department) Card
 *    - 본부 그리드: Mobile 1열 / Desktop 2열
 *    - 내부 임원: 항상 grid-cols-2
 */
export function OrganizationSection({
  title = "조직 구성",
  showTitle = true,
  summary,
  executives,
  members: membersProp,
  federationSlug,
  chairpersonPhotoUrl,
}: OrganizationSectionProps) {
  const [selected, setSelected] = useState<FederationOrganizationMember | null>(null);

  const members = useMemo(() => {
    if (Array.isArray(membersProp) && membersProp.length > 0) {
      return resolveOrganizationMembers({
        federationSlug,
        executives: membersProp.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.position,
          position: m.position,
          department: m.department,
          photo: m.photo,
          description: m.description,
          order: m.order,
        })),
        chairpersonPhotoUrl,
      });
    }
    return resolveOrganizationMembers({
      federationSlug,
      executives,
      chairpersonPhotoUrl,
    });
  }, [membersProp, executives, federationSlug, chairpersonPhotoUrl]);

  const groups = useMemo(() => groupOrganizationMembers(members), [members]);
  const topPair = useMemo(() => pickGroups(groups, TOP_PAIR_IDS), [groups]);
  const orgCards = useMemo(() => departmentStyleGroups(groups), [groups]);

  return (
    <div className="w-full">
      {showTitle ? (
        <h2 className="mb-3 text-xl font-bold text-gray-900">{title}</h2>
      ) : null}
      {summary ? (
        <p className="mb-6 w-full whitespace-pre-line leading-relaxed text-gray-700">{summary}</p>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-gray-500">임원 정보가 없습니다.</p>
      ) : (
        <div className="w-full space-y-8 md:space-y-10">
          {/* ① 회장 | 수석부회장 */}
          {topPair.length > 0 ? (
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              {topPair.map((group) => (
                <OrganizationGroup
                  key={group.id}
                  group={group}
                  variant="leadership"
                  embedded
                  onSelectMember={setSelected}
                />
              ))}
            </div>
          ) : null}

          {/* ② 사무국 + 본부 — 동일 Card / 동일 members Grid */}
          {orgCards.length > 0 ? (
            <div className="w-full">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  조직 · 본부
                </h3>
                <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
              </div>
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                {orgCards.map((group) => (
                  <OrganizationGroup
                    key={group.id}
                    group={group}
                    variant="department"
                    onSelectMember={setSelected}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <OrganizationMemberDetailModal
        member={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export default OrganizationSection;
