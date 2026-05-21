// functions/src/memberStatusTransition.ts
// 🔒 장기 미납 자동 상태 전환 & 권한 제어 시스템
// "운영진이 불편한 결정을 안 하게 만드는 것"

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 📋 장기 미납 단계 정의 (정책 고정)
 * 
 * 미납 기간 | 시스템 상태 | 의미
 * ---------|------------|----------
 * 2개월    | WARNED     | 공식 경고 (알림 발송)
 * 3개월    | RESTRICTED | 권한 제한
 * 4개월    | PAUSED_AUTO| 자동 휴원
 * 6개월    | REMOVAL_CANDIDATE | 제명 후보
 */
export type MemberUnpaidStatus = 
  | "NORMAL"           // 정상 (미납 0-1개월)
  | "WARNED"           // 경고 (2개월)
  | "RESTRICTED"       // 제한 (3개월)
  | "PAUSED_AUTO"      // 자동 휴원 (4개월)
  | "REMOVAL_CANDIDATE"; // 제명 후보 (6개월)

export type MemberStatus = "active" | "paused" | "expelled";

/**
 * 🔒 상태별 권한 정의
 */
interface MemberPermissions {
  voting: boolean;      // 투표 권한
  eventJoin: boolean;   // 이벤트 참여 권한
  writePost: boolean;   // 게시글 작성 권한
  viewOnly: boolean;    // 조회만 가능
}

const STATUS_PERMISSIONS: Record<MemberUnpaidStatus, MemberPermissions> = {
  NORMAL: {
    voting: true,
    eventJoin: true,
    writePost: true,
    viewOnly: false,
  },
  WARNED: {
    voting: true,
    eventJoin: true,
    writePost: true,
    viewOnly: false,
  },
  RESTRICTED: {
    voting: false,
    eventJoin: false,
    writePost: false,
    viewOnly: true,
  },
  PAUSED_AUTO: {
    voting: false,
    eventJoin: false,
    writePost: false,
    viewOnly: true,
  },
  REMOVAL_CANDIDATE: {
    voting: false,
    eventJoin: false,
    writePost: false,
    viewOnly: true,
  },
};

/**
 * 📊 미납 기간 → 상태 매핑 (불변·기계적)
 */
function getStatusFromUnpaidMonths(unpaidMonths: number): MemberUnpaidStatus {
  if (unpaidMonths >= 6) {
    return "REMOVAL_CANDIDATE";
  } else if (unpaidMonths >= 4) {
    return "PAUSED_AUTO";
  } else if (unpaidMonths >= 3) {
    return "RESTRICTED";
  } else if (unpaidMonths >= 2) {
    return "WARNED";
  }
  return "NORMAL";
}

/**
 * 🔄 상태 전환 실행
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @param fromStatus 이전 상태
 * @param toStatus 목표 상태
 * @param reason 전환 사유
 * @param basedOnReport 기준 리포트 월
 * @param isOverride 수동 Override 여부
 * @param overrideReason Override 사유 (수동인 경우)
 */
async function transitionMemberStatus(
  teamId: string,
  memberId: string,
  fromStatus: MemberUnpaidStatus,
  toStatus: MemberUnpaidStatus,
  reason: string,
  basedOnReport: string,
  isOverride: boolean = false,
  overrideReason?: string
): Promise<void> {
  const memberRef = db.collection("teams").doc(teamId).collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  
  if (!memberDoc.exists) {
    throw new Error(`회원을 찾을 수 없습니다: ${memberId}`);
  }

  const memberData = memberDoc.data()!;
  const permissions = STATUS_PERMISSIONS[toStatus];

  // 🔄 상태 전환 업데이트
  const updateData: any = {
    unpaidStatus: toStatus,
    permissions: permissions,
    lastStatusTransition: FieldValue.serverTimestamp(),
  };

  // ⏸️ PAUSED_AUTO인 경우 추가 처리
  if (toStatus === "PAUSED_AUTO") {
    updateData.status = "paused";
    updateData.pausedReason = "UNPAID_AUTO";
    updateData.pausedAt = FieldValue.serverTimestamp();
  }

  // ⚠️ REMOVAL_CANDIDATE인 경우 플래그 추가
  if (toStatus === "REMOVAL_CANDIDATE") {
    const currentFlags = memberData.flags || [];
    if (!currentFlags.includes("REMOVAL_REVIEW_REQUIRED")) {
      updateData.flags = FieldValue.arrayUnion("REMOVAL_REVIEW_REQUIRED");
    }
  }

  // 🔄 이전 상태가 PAUSED_AUTO였고 새로운 상태가 그보다 낮으면 status 복구
  if (fromStatus === "PAUSED_AUTO" && toStatus !== "PAUSED_AUTO" && memberData.status === "paused" && memberData.pausedReason === "UNPAID_AUTO") {
    updateData.status = "active";
    updateData.pausedReason = FieldValue.delete();
    updateData.pausedAt = FieldValue.delete();
  }

  // 🔄 REMOVAL_CANDIDATE에서 벗어나면 플래그 제거
  if (fromStatus === "REMOVAL_CANDIDATE" && toStatus !== "REMOVAL_CANDIDATE") {
    const currentFlags = memberData.flags || [];
    if (currentFlags.includes("REMOVAL_REVIEW_REQUIRED")) {
      updateData.flags = FieldValue.arrayRemove("REMOVAL_REVIEW_REQUIRED");
    }
  }

  await memberRef.update(updateData);

  // 📝 전환 기록 저장 (절대 삭제 금지)
  const transitionRef = db
    .collection("teams")
    .doc(teamId)
    .collection("memberTransitions")
    .doc();

  await transitionRef.set({
    memberId,
    memberName: memberData.name || "이름 없음",
    fromStatus,
    toStatus,
    reason: isOverride ? `OVERRIDE: ${overrideReason || reason}` : reason,
    basedOnReport,
    unpaidMonths: memberData.unpaidMonths || 0,
    isOverride,
    overrideReason: isOverride ? overrideReason : null,
    executedAt: FieldValue.serverTimestamp(),
    executedBy: isOverride ? "OWNER" : "SYSTEM",
  });

  console.log(`✅ 상태 전환 완료: ${memberData.name} (${fromStatus} → ${toStatus})`);
}

/**
 * 🎯 월간 리포트 기반 자동 상태 전환
 * 
 * 월간 리포트 생성 시 자동으로 실행되는 함수
 * 모든 회원의 미납 기간을 확인하고 상태를 자동 전환
 * 
 * @param teamId 팀 ID
 * @param month 리포트 월 (YYYY-MM)
 */
export async function autoTransitionMemberStatuses(
  teamId: string,
  month: string
): Promise<void> {
  console.log(`🔄 [autoTransitionMemberStatuses] 팀 ${teamId}, 월 ${month} 상태 전환 시작`);

  try {
    // 🔥 모든 회원 조회 (삭제되지 않은 회원만)
    const membersSnapshot = await db
      .collection("teams")
      .doc(teamId)
      .collection("members")
      .where("isDeleted", "==", false)
      .get();

    if (membersSnapshot.empty) {
      console.log(`⚠️ 회원이 없습니다.`);
      return;
    }

    let transitionCount = 0;
    let skippedCount = 0;

    // 🔄 각 회원별 상태 전환 검토
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      const memberId = memberDoc.id;

      // 🔥 면제자는 제외
      if (memberData.feePlan === "exempt") {
        continue;
      }

      // 🔥 이미 제명된 회원은 제외
      if (memberData.status === "expelled") {
        continue;
      }

      // 🔥 수동 Override가 있는 경우 스킵 (isStatusOverridden 플래그 확인)
      if (memberData.isStatusOverridden) {
        console.log(`⏭️ ${memberData.name}: 수동 Override 상태로 스킵`);
        skippedCount++;
        continue;
      }

      const unpaidMonths = memberData.unpaidMonths || 0;
      const currentUnpaidStatus = memberData.unpaidStatus || "NORMAL";
      const targetStatus = getStatusFromUnpaidMonths(unpaidMonths);

      // 🔄 상태 변경이 필요한 경우에만 전환
      if (currentUnpaidStatus !== targetStatus) {
        const reason = `UNPAID_${unpaidMonths}_MONTHS`;
        
        await transitionMemberStatus(
          teamId,
          memberId,
          currentUnpaidStatus,
          targetStatus,
          reason,
          month,
          false
        );
        
        transitionCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ 상태 전환 완료: ${transitionCount}명 전환, ${skippedCount}명 스킵`);

    // 📊 전환 통계 기록
    await db.collection("teams").doc(teamId).collection("statusTransitionLogs").add({
      month,
      transitionCount,
      skippedCount,
      totalMembers: membersSnapshot.size,
      executedAt: FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error(`❌ 상태 전환 실패:`, error);
    throw error;
  }
}

/**
 * 🛠️ OWNER 전용 상태 Override
 * 
 * 운영진이 특정 회원의 상태를 수동으로 변경할 수 있는 함수
 * 모든 Override는 기록되어야 함
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @param targetStatus 목표 상태
 * @param reason Override 사유 (필수)
 * @param ownerId OWNER ID (인증용)
 */
export async function overrideMemberStatus(
  teamId: string,
  memberId: string,
  targetStatus: MemberUnpaidStatus,
  reason: string,
  ownerId: string
): Promise<void> {
  console.log(`🛠️ [overrideMemberStatus] 회원 ${memberId} 상태 Override 시작`);

  if (!reason || reason.trim().length === 0) {
    throw new Error("Override 사유는 필수입니다.");
  }

  // 🔥 OWNER 권한 확인
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const teamData = teamDoc.data()!;
  const owners = teamData.owners || [];
  
  if (!owners.includes(ownerId)) {
    throw new Error("OWNER 권한이 필요합니다.");
  }

  // 🔥 회원 정보 조회
  const memberRef = db.collection("teams").doc(teamId).collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  
  if (!memberDoc.exists) {
    throw new Error("회원을 찾을 수 없습니다.");
  }

  const memberData = memberDoc.data()!;
  const currentStatus = memberData.unpaidStatus || "NORMAL";

  // 🔄 상태 전환 실행 (Override 플래그)
  await transitionMemberStatus(
    teamId,
    memberId,
    currentStatus,
    targetStatus,
    "MANUAL_OVERRIDE",
    "N/A",
    true,
    reason
  );

  // 🔥 Override 플래그 설정
  await memberRef.update({
    isStatusOverridden: true,
    statusOverrideReason: reason,
    statusOverrideBy: ownerId,
    statusOverrideAt: FieldValue.serverTimestamp(),
  });

  // 📝 Override 로그 별도 저장
  await db.collection("teams").doc(teamId).collection("statusOverrides").add({
    memberId,
    memberName: memberData.name || "이름 없음",
    fromStatus: currentStatus,
    toStatus: targetStatus,
    reason,
    overriddenBy: ownerId,
    overriddenAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ Override 완료: ${memberData.name} (${currentStatus} → ${targetStatus})`);
}

/**
 * 🔄 상태 Override 해제
 * 
 * 수동 Override를 해제하고 자동 전환으로 복귀
 */
export async function removeStatusOverride(
  teamId: string,
  memberId: string,
  ownerId: string
): Promise<void> {
  console.log(`🔄 [removeStatusOverride] 회원 ${memberId} Override 해제 시작`);

  // 🔥 OWNER 권한 확인
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const teamData = teamDoc.data()!;
  const owners = teamData.owners || [];
  
  if (!owners.includes(ownerId)) {
    throw new Error("OWNER 권한이 필요합니다.");
  }

  // 🔥 회원 정보 조회
  const memberRef = db.collection("teams").doc(teamId).collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  
  if (!memberDoc.exists) {
    throw new Error("회원을 찾을 수 없습니다.");
  }

  const memberData = memberDoc.data()!;
  const unpaidMonths = memberData.unpaidMonths || 0;
  const targetStatus = getStatusFromUnpaidMonths(unpaidMonths);
  const currentStatus = memberData.unpaidStatus || "NORMAL";

  // 🔄 Override 플래그 제거
  await memberRef.update({
    isStatusOverridden: false,
    statusOverrideReason: FieldValue.delete(),
    statusOverrideBy: FieldValue.delete(),
    statusOverrideAt: FieldValue.delete(),
  });

  // 🔄 자동 상태로 복귀 (필요한 경우)
  if (currentStatus !== targetStatus) {
    await transitionMemberStatus(
      teamId,
      memberId,
      currentStatus,
      targetStatus,
      "OVERRIDE_REMOVED",
      "N/A",
      false
    );
  }

  console.log(`✅ Override 해제 완료: ${memberData.name}`);
}

/**
 * 🌐 HTTP Callable 함수: 상태 Override
 */
export const overrideMemberStatusCallable = onCall(async (request) => {
  const { teamId, memberId, targetStatus, reason } = request.data;
  const ownerId = request.auth?.uid;

  if (!ownerId) {
    throw new Error("인증이 필요합니다.");
  }

  if (!teamId || !memberId || !targetStatus || !reason) {
    throw new Error("필수 파라미터가 누락되었습니다.");
  }

  await overrideMemberStatus(teamId, memberId, targetStatus, reason, ownerId);

  return { success: true };
});

/**
 * 🌐 HTTP Callable 함수: Override 해제
 */
export const removeStatusOverrideCallable = onCall(async (request) => {
  const { teamId, memberId } = request.data;
  const ownerId = request.auth?.uid;

  if (!ownerId) {
    throw new Error("인증이 필요합니다.");
  }

  if (!teamId || !memberId) {
    throw new Error("필수 파라미터가 누락되었습니다.");
  }

  await removeStatusOverride(teamId, memberId, ownerId);

  return { success: true };
});

