/**
 * 🔥 Global Operation - 글로벌 운영 모델
 * 
 * 국가 매니저, 협회 계정, 글로벌 Admin
 */

import type { Country } from "./global.types";

/**
 * 운영 역할
 */
export type GlobalRole =
  | "global_admin"    // 글로벌 Admin (전체 국가)
  | "country_manager" // 국가 매니저 (특정 국가)
  | "federation"       // 협회 계정 (특정 협회)
  | "local_manager";   // 지역 매니저 (특정 지역)

/**
 * 권한 매트릭스
 */
export type GlobalPermission = {
  canManageCountries: boolean;
  canManageLeagues: boolean;
  canManageStories: boolean;
  canViewAnalytics: boolean;
  canManageSettlements: boolean;
};

/**
 * 역할별 권한
 */
export const GLOBAL_PERMISSIONS: Record<GlobalRole, GlobalPermission> = {
  global_admin: {
    canManageCountries: true,
    canManageLeagues: true,
    canManageStories: true,
    canViewAnalytics: true,
    canManageSettlements: true,
  },
  country_manager: {
    canManageCountries: false,
    canManageLeagues: true,
    canManageStories: true,
    canViewAnalytics: true,
    canManageSettlements: true,
  },
  federation: {
    canManageCountries: false,
    canManageLeagues: true, // 자신의 리그만
    canManageStories: true,  // 자신의 스토리만
    canViewAnalytics: false,
    canManageSettlements: false,
  },
  local_manager: {
    canManageCountries: false,
    canManageLeagues: false,
    canManageStories: true,  // 자신의 지역만
    canViewAnalytics: true,  // 자신의 지역만
    canManageSettlements: false,
  },
};

/**
 * 국가별 접근 권한 확인
 */
export function canAccessCountry(
  role: GlobalRole,
  userCountry?: Country,
  targetCountry?: Country
): boolean {
  if (role === "global_admin") {
    return true; // 글로벌 Admin은 모든 국가 접근 가능
  }

  if (!userCountry || !targetCountry) {
    return false;
  }

  return userCountry === targetCountry;
}

/**
 * 론치 순서 (천재 로드맵)
 */
export const LAUNCH_ORDER: Country[] = [
  "KR", // 한국 (기존)
  "JP", // 일본 - 구장 밀집
  "VN", // 베트남 - 커뮤니티 강
  "ID", // 인도네시아
  "TH", // 태국
];
