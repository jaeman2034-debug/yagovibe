/**
 * 🔥 Organization (조직) 타입 정의
 * 
 * 역할: 전국 플랫폼 확장을 위한 조직 계층 구조
 * 경로: organizations/{orgId}
 */

import { Timestamp } from "firebase/firestore";

/**
 * Organization Type
 */
export type OrganizationType =
  | "platform"      // 플랫폼 전체
  | "province"      // 시/도
  | "city"          // 시/군
  | "district"      // 구/군
  | "association";  // 협회

/**
 * Organization Status
 */
export type OrganizationStatus =
  | "active"
  | "inactive"
  | "suspended";

/**
 * Organization Role
 */
export type OrganizationRole =
  | "super_admin"        // 플랫폼 전체 관리자
  | "organization_admin" // Organization 관리자
  | "association_admin"  // 협회 관리자
  | "event_manager"     // 행사 운영자
  | "referee"           // 심판
  | "viewer";           // 조회만 가능

/**
 * Organization (조직)
 * 
 * 경로: organizations/{orgId}
 */
export interface Organization {
  id: string;

  // 기본 정보
  name: string;                    // "노원구 축구협회"
  type: OrganizationType;          // "association"
  level: number;                   // 1: 플랫폼, 2: 시/도, 3: 구/군, 4: 협회
  parentOrgId?: string | null;    // 상위 Organization ID

  // 지역/종목
  regionCode: string;              // "KR_SEOUL_NOWON"
  sportType: string;               // "football" | "futsal"

  // 상태
  status: OrganizationStatus;

  // 설명
  description?: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;

  // 메타데이터
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Organization Member (조직 멤버)
 * 
 * 경로: organization_members/{orgId}_{userId}
 */
export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  userName?: string;
  role: OrganizationRole;
  status: "active" | "inactive";
  joinedAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Create Organization Input
 */
export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  level: number;
  parentOrgId?: string | null;
  regionCode: string;
  sportType: string;
  description?: string;
  createdBy: string;
}
