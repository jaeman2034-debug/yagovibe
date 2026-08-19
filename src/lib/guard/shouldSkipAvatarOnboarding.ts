import type { HomeRoleSegment } from "@/lib/team/resolveHomeRole";

/** Sprint D — 보호자 성장 리포트 뷰 (player avatars/{uid} 온보딩과 무관) */
export function isGuardianGrowthReportPath(pathname: string): boolean {
  return /^\/team\/[^/]+\/growth-report\/[^/]+/.test(pathname);
}

/**
 * `avatars/{uid}` 온보딩 가드 스킵 여부.
 * 보호자 전용 계정(admin+parent 등)은 본인 아바타 없이 자녀 리포트·팀 조회 가능.
 */
export function shouldSkipAvatarOnboarding(params: {
  pathname: string;
  allowedSegments: HomeRoleSegment[];
  primarySegment: HomeRoleSegment | null;
  isAnonymous: boolean;
  isContentCreate: boolean;
  onAvatarPage: boolean;
}): boolean {
  const { pathname, allowedSegments, primarySegment, isAnonymous, isContentCreate, onAvatarPage } =
    params;

  if (onAvatarPage || isAnonymous || isContentCreate) return true;

  const hasParentRole = allowedSegments.includes("parent");
  const hasPlayerRole = allowedSegments.includes("player");
  const isGuardianOnlyAccount = hasParentRole && !hasPlayerRole;

  if (primarySegment === "parent" || isGuardianOnlyAccount) return true;

  if (hasParentRole && isGuardianGrowthReportPath(pathname)) return true;

  return false;
}
