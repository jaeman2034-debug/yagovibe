/**
 * Policy Resolver
 * 팀 상태 + 시설 정책 → 대관 권한 결정
 * 
 * 모든 권한/우선권의 단일 진실 소스
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { TeamStatus, FacilityAccessPolicy, BookingPermission } from "../types/policy";
import { getBookingPermission } from "../utils/bookingPermissionMatrix";

// Firebase Admin 초기화 (지연 초기화)
function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

/**
 * Policy Input
 */
export interface PolicyInput {
  associationId: string;
  teamId: string;
  facilityId: string;
  startAt?: Date; // 예약 날짜 (슬롯 정책용)
}

/**
 * Policy Result
 */
export interface PolicyResult {
  /** 대관 신청 가능 여부 */
  canBook: boolean;
  
  /** 대기 신청 가능 여부 */
  canWaitlist: boolean;
  
  /** 우선순위 */
  priority: "HIGH" | "MEDIUM" | "LOW";
  
  /** 사용자 메시지 */
  message: string;
  
  /** 액션 타입 (상세) */
  actionType: BookingPermission;
  
  /** 결정 이유 코드 */
  reasonCode: string;
  
  /** 회원팀 전환 CTA 표시 여부 */
  showConversionCTA?: boolean;
}

/**
 * 팀 상태 조회
 */
async function resolveTeamStatus(teamId: string): Promise<TeamStatus> {
  const db = getDb();
  try {
    const teamDoc = await db.doc(`teams/${teamId}`).get();
    
    if (!teamDoc.exists) {
      logger.warn(`Team not found: ${teamId}`);
      throw new Error(`Team not found: ${teamId}`);
    }
    
    const teamData = teamDoc.data()!;
    
    // 🔥 팀이 아직 초기화되지 않았을 수 있음 (방금 생성된 팀)
    // status가 "active"가 아니면 기본값 반환
    const teamStatus = teamData.status as string | undefined;
    if (teamStatus !== "active") {
      logger.warn(`Team not yet active: ${teamId}, status=${teamStatus}`);
      return TeamStatus.NON_MEMBER; // 초기화 전 팀은 비회원팀으로 간주
    }
    
    // 🔥 Canonical field: teams/{teamId}.membership
    // membership 필드가 팀 정책 상태의 단일 진실 원천 (SSOT)
    const membership = teamData.membership as string | undefined;
    
    // membership → TeamStatus 변환 (canonical field 우선)
    if (membership) {
      switch (membership) {
        case "member":
          return TeamStatus.MEMBER;
        case "non-member":
          return TeamStatus.NON_MEMBER;
        case "academy":
          return TeamStatus.ACADEMY;
        case "pending":
          return TeamStatus.PENDING;
      }
    }
    
    // 하위 호환성: 기존 status 필드 확인 (레거시 - 마이그레이션 완료 후 제거 예정)
    const status = teamData.status as string | undefined;
    if (
      status === TeamStatus.MEMBER ||
      status === TeamStatus.NON_MEMBER ||
      status === TeamStatus.ACADEMY ||
      status === TeamStatus.PENDING
    ) {
      logger.warn(`⚠️ [policyResolver] Using legacy status field for team ${teamId}. Please migrate to membership field.`);
      return status as TeamStatus;
    }
    
    // 기본값: 비회원팀
    logger.warn(`Invalid team status/membership for team ${teamId}: status=${status}, membership=${membership}`);
    return TeamStatus.NON_MEMBER;
  } catch (error) {
    logger.error(`Error resolving team status: ${error}`);
    throw error;
  }
}

/**
 * 시설 접근 정책 조회
 */
async function resolveFacilityAccessPolicy(facilityId: string): Promise<FacilityAccessPolicy> {
  const db = getDb();
  try {
    const facilityDoc = await db.doc(`facilities/${facilityId}`).get();
    
    if (!facilityDoc.exists) {
      logger.warn(`Facility not found: ${facilityId}`);
      // 기본값: 일반 공공 시설
      return FacilityAccessPolicy.PUBLIC_OPEN;
    }
    
    const facilityData = facilityDoc.data()!;
    const accessPolicy = facilityData.accessPolicy as string;
    
    // 타입 가드
    if (
      accessPolicy === FacilityAccessPolicy.ASSOCIATION_PRIORITY ||
      accessPolicy === FacilityAccessPolicy.ASSOCIATION_MANAGED ||
      accessPolicy === FacilityAccessPolicy.PUBLIC_OPEN
    ) {
      return accessPolicy as FacilityAccessPolicy;
    }
    
    // 기본값
    logger.warn(`Invalid accessPolicy for facility ${facilityId}: ${accessPolicy}`);
    return FacilityAccessPolicy.PUBLIC_OPEN;
  } catch (error) {
    logger.error(`Error resolving facility access policy: ${error}`);
    throw error;
  }
}

/**
 * 우선순위 결정
 */
function resolvePriority(
  teamStatus: TeamStatus,
  actionType: BookingPermission
): "HIGH" | "MEDIUM" | "LOW" {
  if (actionType === BookingPermission.APPLY && teamStatus === TeamStatus.MEMBER) {
    return "HIGH";
  }
  if (actionType === BookingPermission.REQUEST && teamStatus === TeamStatus.ACADEMY) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * 대관 권한 결정 (메인 함수)
 * 
 * @param input - Policy Input (associationId, teamId, facilityId, startAt?)
 * @returns Policy Result
 */
export async function resolveBookingPolicy(input: PolicyInput): Promise<PolicyResult> {
  const { teamId, facilityId, startAt } = input;
  
  try {
    // 1. 팀 상태 조회
    const teamStatus = await resolveTeamStatus(teamId);
    
    // 2. 시설 접근 정책 조회
    const facilityPolicy = await resolveFacilityAccessPolicy(facilityId);
    
    // 3. 슬롯 우선권 정책 확인 (날짜 기반)
    let slotPolicyMessage = "";
    let slotCanBook = true;
    
    if (startAt) {
      const slotPolicy = checkSlotBookingPolicy(teamStatus, startAt);
      slotCanBook = slotPolicy.canBook;
      slotPolicyMessage = slotPolicy.message;
    }
    
    // 4. 권한 계산 (매트릭스 기반)
    const permissionDecision = getBookingPermission(teamStatus, facilityPolicy);
    
    // 5. Policy Result 생성 (슬롯 정책과 결합)
    const canBook = slotCanBook && permissionDecision.actionType === BookingPermission.APPLY;
    const canWaitlist = permissionDecision.actionType === BookingPermission.WAITLIST;
    const priority = resolvePriority(teamStatus, permissionDecision.actionType);
    
    // 메시지 결합 (슬롯 정책 우선)
    const finalMessage = slotPolicyMessage || permissionDecision.message || "";
    
    return {
      canBook,
      canWaitlist,
      priority,
      message: finalMessage,
      actionType: slotCanBook ? permissionDecision.actionType : BookingPermission.VIEW_ONLY,
      reasonCode: permissionDecision.reasonCode,
      showConversionCTA: permissionDecision.showConversionCTA,
    };
  } catch (error) {
    logger.error(`Error resolving booking policy: ${error}`);
    throw error;
  }
}

/**
 * 간소화된 권한 조회 (팀 상태만 필요할 때)
 */
export async function resolveBookingPolicySimple(
  teamId: string,
  facilityId: string
): Promise<PolicyResult> {
  const db = getDb();
  try {
    // 팀 문서에서 associationId 가져오기
    const teamDoc = await db.doc(`teams/${teamId}`).get();
    if (!teamDoc.exists) {
      throw new Error(`Team not found: ${teamId}`);
    }
    
    const teamData = teamDoc.data()!;
    const associationId = teamData.associationId || "";
    
    return resolveBookingPolicy({
      associationId,
      teamId,
      facilityId,
    });
  } catch (error) {
    logger.error(`Error resolving booking policy (simple): ${error}`);
    throw error;
  }
}

