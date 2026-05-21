/**
 * 🔥 권한 레벨링 시스템
 * 
 * 역할:
 * - 신뢰도 기반 기능 개방
 * - 결제/예약 안전장치
 * - 어뷰징 방어
 */

import type { TrustTier } from "./trustScore";
import type { User } from "firebase/auth";

export type PermissionLevel = "guest" | "basic" | "verified" | "host";

export interface PermissionCheck {
  canView: boolean;
  canJoin: boolean;
  canCreate: boolean;
  canPay: boolean;
  canHost: boolean;
}

/**
 * 권한 레벨별 허용 기능
 * 
 * | 레벨       | 조건         | 허용    |
 * | -------- | ---------- | ----- |
 * | guest    | 미로그인       | 보기    |
 * | basic    | trust < 70 | 참여    |
 * | verified | trust ≥ 70 | 생성/결제 |
 * | host     | 추가 검증      | 호스트   |
 */
const PERMISSION_MAP: Record<PermissionLevel, PermissionCheck> = {
  guest: {
    canView: true,
    canJoin: false,
    canCreate: false,
    canPay: false,
    canHost: false,
  },
  basic: {
    canView: true,
    canJoin: true,
    canCreate: false,
    canPay: false,
    canHost: false,
  },
  verified: {
    canView: true,
    canJoin: true,
    canCreate: true,
    canPay: true,
    canHost: false,
  },
  host: {
    canView: true,
    canJoin: true,
    canCreate: true,
    canPay: true,
    canHost: true,
  },
};

/**
 * 사용자 권한 확인
 * 
 * @param user - Firebase Auth User
 * @param userData - Firestore user 데이터
 * @returns PermissionCheck
 */
export function checkPermissions(
  user: User | null,
  userData?: any
): PermissionCheck {
  // 🔥 미로그인 → guest
  if (!user || user.isAnonymous) {
    return PERMISSION_MAP.guest;
  }

  // 🔥 userData가 없으면 기본값 (basic)
  if (!userData) {
    return PERMISSION_MAP.basic;
  }

  // 🔥 trustTier 기반 권한 결정
  const trustTier = (userData.trustTier || "basic") as TrustTier;
  return PERMISSION_MAP[trustTier] || PERMISSION_MAP.basic;
}

/**
 * 결제 가능 여부 확인
 * 
 * @param user - Firebase Auth User
 * @param userData - Firestore user 데이터
 * @returns 결제 가능 여부
 */
export function canPay(user: User | null, userData?: any): boolean {
  if (!user || user.isAnonymous) {
    return false;
  }

  if (!userData) {
    return false;
  }

  // 🔥 verified 이상 + 프로필 완성 필수
  const trustTier = (userData.trustTier || "basic") as TrustTier;
  const isProfileComplete = userData.isProfileComplete || false;

  return trustTier === "verified" || trustTier === "host" ? isProfileComplete : false;
}

/**
 * 생성 가능 여부 확인 (모임/이벤트)
 * 
 * @param user - Firebase Auth User
 * @param userData - Firestore user 데이터
 * @returns 생성 가능 여부
 */
export function canCreate(user: User | null, userData?: any): boolean {
  if (!user || user.isAnonymous) {
    return false;
  }

  if (!userData) {
    return false;
  }

  const trustTier = (userData.trustTier || "basic") as TrustTier;
  return trustTier === "verified" || trustTier === "host";
}

/**
 * 참여 가능 여부 확인
 * 
 * @param user - Firebase Auth User
 * @param userData - Firestore user 데이터
 * @returns 참여 가능 여부
 */
export function canJoin(user: User | null, userData?: any): boolean {
  if (!user || user.isAnonymous) {
    return false;
  }

  if (!userData) {
    return false;
  }

  const trustTier = (userData.trustTier || "basic") as TrustTier;
  return trustTier !== "guest";
}

/**
 * 호스트 가능 여부 확인
 * 
 * @param user - Firebase Auth User
 * @param userData - Firestore user 데이터
 * @returns 호스트 가능 여부
 */
export function canHost(user: User | null, userData?: any): boolean {
  if (!user || user.isAnonymous) {
    return false;
  }

  if (!userData) {
    return false;
  }

  const trustTier = (userData.trustTier || "basic") as TrustTier;
  return trustTier === "host";
}
