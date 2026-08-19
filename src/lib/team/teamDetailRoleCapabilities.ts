/**
 * `/team/:teamId` — 역할별 UI·액션 capabilities (guardian/parent read-only 등).
 */
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { isGuardianMemberRole } from "@/lib/guardian/guardianReadSelectors";

export type TeamDetailCapabilities = {
  /** 상단 회비 카드 */
  showFeeSummaryCard: boolean;
  feeSummaryLabel: string;
  /** 퀵 액션 그리드 */
  showRecruitQuickAction: boolean;
  showLineupQuickAction: boolean;
  showChatQuickAction: boolean;
  showMembersQuickAction: boolean;
  showScheduleQuickAction: boolean;
  showFeeQuickAction: boolean;
  feeQuickActionLabel: string;
  /** 상단 2열 퀵 그리드(채팅·멤버·일정 등) — 보호자는 탭만 사용 */
  showQuickActionGrid: boolean;
  /** 탭·콘텐츠 */
  canManageMembers: boolean;
  canPostTeamWall: boolean;
  canCreateSchedule: boolean;
  canManageRecruit: boolean;
  canEditLineup: boolean;
  canPayOwnTeamFees: boolean;
  showTeamFeePaymentList: boolean;
  showOwnerSummary: boolean;
  showOnboardingBanner: boolean;
  showMemberInviteOnHome: boolean;
  showActivityFeed: boolean;
};

const MEMBER_DEFAULT: TeamDetailCapabilities = {
  showFeeSummaryCard: true,
  feeSummaryLabel: "내 회비",
  showRecruitQuickAction: false,
  showLineupQuickAction: true,
  showChatQuickAction: true,
  showMembersQuickAction: true,
  showScheduleQuickAction: true,
  showFeeQuickAction: false,
  feeQuickActionLabel: "내 회비",
  showQuickActionGrid: true,
  canManageMembers: false,
  canPostTeamWall: true,
  canCreateSchedule: true,
  canManageRecruit: false,
  canEditLineup: true,
  canPayOwnTeamFees: true,
  showTeamFeePaymentList: true,
  showOwnerSummary: false,
  showOnboardingBanner: true,
  showMemberInviteOnHome: false,
  showActivityFeed: true,
};

const OWNER_DEFAULT: TeamDetailCapabilities = {
  ...MEMBER_DEFAULT,
  showRecruitQuickAction: true,
  canManageMembers: true,
  canManageRecruit: true,
  showOwnerSummary: true,
  showMemberInviteOnHome: true,
};

const GUARDIAN: TeamDetailCapabilities = {
  showFeeSummaryCard: true,
  feeSummaryLabel: "연결 자녀 회비",
  showRecruitQuickAction: false,
  showLineupQuickAction: false,
  showChatQuickAction: false,
  showMembersQuickAction: false,
  showScheduleQuickAction: false,
  showFeeQuickAction: false,
  feeQuickActionLabel: "연결 자녀 회비",
  showQuickActionGrid: false,
  canManageMembers: false,
  canPostTeamWall: false,
  canCreateSchedule: false,
  canManageRecruit: false,
  canEditLineup: false,
  canPayOwnTeamFees: false,
  showTeamFeePaymentList: false,
  showOwnerSummary: false,
  showOnboardingBanner: false,
  showMemberInviteOnHome: false,
  showActivityFeed: true,
};

export function getTeamDetailCapabilities(
  roleRaw: string | undefined | null,
  options?: { isTeamOwner?: boolean }
): TeamDetailCapabilities {
  if (options?.isTeamOwner) return OWNER_DEFAULT;
  if (isGuardianMemberRole(roleRaw)) return GUARDIAN;
  const role = normalizeMemberRole(roleRaw);
  if (role === "coach" || role === "manager" || role === "staff") {
    return {
      ...MEMBER_DEFAULT,
      showRecruitQuickAction: false,
      canEditLineup: true,
    };
  }
  return MEMBER_DEFAULT;
}

export function teamDetailActionBlocked(
  caps: TeamDetailCapabilities,
  action: "recruit" | "lineup" | "announcement" | "memberMutate" | "scheduleCreate"
): boolean {
  switch (action) {
    case "recruit":
      return !caps.canManageRecruit;
    case "lineup":
      return !caps.canEditLineup;
    case "announcement":
      return !caps.canPostTeamWall;
    case "memberMutate":
      return !caps.canManageMembers;
    case "scheduleCreate":
      return !caps.canCreateSchedule;
    default:
      return true;
  }
}
