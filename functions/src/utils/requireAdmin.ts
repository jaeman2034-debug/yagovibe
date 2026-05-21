// functions/src/utils/requireAdmin.ts
// 🔐 관리자 권한 체크 공통 함수

import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// 🔥 모듈 레벨 getFirestore() 제거 (배포 타임아웃 방지)
// const db = getFirestore(); // ❌ 제거

/**
 * 관리자 권한 확인 (공통 가드)
 * 
 * 권한 우선순위:
 * 1. team.ownerId === uid → 무조건 ADMIN
 * 2. teams/{teamId}/members/{uid}.role === "ADMIN" → ADMIN
 * 3. 그 외 → 권한 없음
 */
export async function requireAdmin(teamId: string, uid: string): Promise<void> {
  // 🔥 함수 내부에서 getFirestore() 호출 (배포 타임아웃 방지)
  const db = getFirestore();
  
  // 팀 정보 조회
  const teamSnap = await db.doc(`teams/${teamId}`).get();
  
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }

  const team = teamSnap.data()!;
  
  // 1순위: 팀 소유자
  if (team.ownerId === uid || team.ownerUid === uid) {
    logger.info("✅ [requireAdmin] 팀 소유자 권한 확인", { teamId, uid });
    return;
  }

  // 2순위: team.owners 배열
  const owners = team.owners || [];
  if (owners.includes(uid)) {
    logger.info("✅ [requireAdmin] owners 배열 권한 확인", { teamId, uid });
    return;
  }

  // 3순위: teams/{teamId}/members/{uid} 서브컬렉션에서 role 확인 (우선 확인)
  try {
    const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
    
    if (memberSnap.exists) {
      const memberData = memberSnap.data()!;
      const originalRole = String(memberData.role || "").trim();
      const roleUpper = originalRole.toUpperCase();
      const roleLower = originalRole.toLowerCase();
      
      // ✅ 관리자 판정: 대소문자 무시 + 다양한 role 값 허용
      const adminRoles = [
        "OWNER", "ADMIN", "STAFF", "MANAGER",
        "총무", "관리자", "운영자",
        "owner", "admin", "staff", "manager",
      ];
      
      const isAdmin = adminRoles.includes(roleUpper) || 
                      adminRoles.includes(roleLower) ||
                      roleUpper === "ADMIN" ||
                      roleLower === "admin";
      
      if (isAdmin) {
        logger.info("✅ [requireAdmin] teams/{teamId}/members/{uid} role 권한 확인", { 
          teamId, 
          uid, 
          role: originalRole,
          path: `teams/${teamId}/members/${uid}`
        });
        return;
      } else {
        logger.warn("⚠️ [requireAdmin] teams/{teamId}/members/{uid} role 불일치", { 
          teamId, 
          uid, 
          originalRole,
          roleUpper,
          roleLower
        });
      }
    } else {
      logger.warn("⚠️ [requireAdmin] teams/{teamId}/members/{uid} 문서 없음", { teamId, uid });
    }
  } catch (error: any) {
    logger.warn("⚠️ [requireAdmin] teams/{teamId}/members/{uid} 조회 실패", { teamId, uid, error: error.message });
  }

  // 4순위: team_members 루트 컬렉션 (레거시 지원) - 가장 흔한 케이스
  try {
    logger.info("🔍 [requireAdmin] team_members 조회 시작", { teamId, uid });
    const legacyMemberSnap = await db
      .collection("team_members")
      .where("teamId", "==", teamId)
      .where("uid", "==", uid)
      .limit(1)
      .get();

    logger.info("🔍 [requireAdmin] team_members 조회 결과", { 
      teamId, 
      uid, 
      found: !legacyMemberSnap.empty,
      count: legacyMemberSnap.size 
    });

    if (!legacyMemberSnap.empty) {
      const memberData = legacyMemberSnap.docs[0].data();
      const originalRole = String(memberData.role || "").trim();
      const roleUpper = originalRole.toUpperCase();
      const roleLower = originalRole.toLowerCase();
      
      // ✅ 관리자 판정: 대소문자 무시 + 다양한 role 값 허용
      const adminRoles = [
        "OWNER", "ADMIN", "STAFF", "MANAGER",
        "총무", "관리자", "운영자",
        "owner", "admin", "staff", "manager", // 소문자도 허용
      ];
      
      const isAdmin = adminRoles.includes(roleUpper) || 
                      adminRoles.includes(roleLower) ||
                      roleUpper === "ADMIN" ||
                      roleLower === "admin";
      
      logger.info("🔍 [requireAdmin] team_members role 확인", { 
        teamId, 
        uid, 
        originalRole,
        roleUpper,
        roleLower,
        isAdmin
      });
      
      if (isAdmin) {
        logger.info("✅ [requireAdmin] team_members role 권한 확인", { teamId, uid, role: originalRole });
        return;
      } else {
        logger.warn("⚠️ [requireAdmin] team_members role 불일치", { 
          teamId, 
          uid, 
          originalRole,
          roleUpper,
          roleLower
        });
      }
    } else {
      logger.warn("⚠️ [requireAdmin] team_members 문서 없음", { teamId, uid });
    }
  } catch (error: any) {
    logger.error("❌ [requireAdmin] team_members 조회 실패", { 
      teamId, 
      uid, 
      error: error.message,
      stack: error.stack 
    });
  }

  // 권한 없음
  logger.warn("❌ [requireAdmin] 권한 없음", { teamId, uid });
  throw new HttpsError(
    "permission-denied",
    "관리자만 가능한 기능입니다."
  );
}

