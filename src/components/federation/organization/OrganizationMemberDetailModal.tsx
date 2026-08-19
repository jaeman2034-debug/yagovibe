import { OrganizationMemberPhoto } from "@/components/federation/organization/OrganizationMemberCard";
import { NOWON_ORG_DEPARTMENT_ORDER } from "@/lib/federation/nowonOrganizationCatalog";
import type { FederationOrganizationMember } from "@/types/federationOrganization";

export type OrganizationMemberDetailModalProps = {
  member: FederationOrganizationMember | null;
  open: boolean;
  onClose: () => void;
};

function departmentLabel(department: string): string {
  return NOWON_ORG_DEPARTMENT_ORDER.find((d) => d.id === department)?.title || department || "—";
}

/**
 * 향후 소개·담당·연락처·경력 표시용 Placeholder.
 * 사진은 Firestore → local → Avatar 폴백 유지.
 */
export function OrganizationMemberDetailModal({
  member,
  open,
  onClose,
}: OrganizationMemberDetailModalProps) {
  if (!open || !member) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-member-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 h-[100px] w-[100px] overflow-hidden rounded-full bg-gray-100">
            <OrganizationMemberPhoto member={member} />
          </div>
          <h2 id="org-member-detail-title" className="text-xl font-semibold text-gray-900">
            {member.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{member.position}</p>
        </div>

        <dl className="mt-6 space-y-3 text-left text-sm">
          <div>
            <dt className="font-medium text-gray-700">담당부서</dt>
            <dd className="mt-1 text-gray-600">{departmentLabel(member.department)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">소개</dt>
            <dd className="mt-1 text-gray-500">
              {member.description?.trim() || "준비 중입니다."}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">담당 업무</dt>
            <dd className="mt-1 text-gray-500">
              {member.duties?.trim() || "준비 중입니다."}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">연락처</dt>
            <dd className="mt-1 text-gray-500">{member.phone?.trim() || "준비 중입니다."}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">이메일</dt>
            <dd className="mt-1 text-gray-500">{member.email?.trim() || "준비 중입니다."}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">경력</dt>
            <dd className="mt-1 text-gray-500">{member.career?.trim() || "준비 중입니다."}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
