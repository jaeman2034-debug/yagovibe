/**
 * 🔥 팀 멤버 동기화 Cloud Functions
 * 
 * 역할:
 * - teams/{teamId}/members/{uid} 변경 시
 * - team_members 역인덱스 자동 동기화
 * - teams.memberCount 자동 업데이트
 * 
 * ========================================
 * 📍 Canonical Source (SSOT)
 * ========================================
 * 
 * 권한의 단일 진실 원천:
 * - teams/{teamId}/members/{uid}.role
 * 
 * team_members 컬렉션:
 * - 빠른 조회용 캐시 인덱스
 * - 권한 판정에 사용하지 않음
 * 
 * ========================================
 * 🔄 동기화 규칙
 * ========================================
 * 
 * onCreate:
 * - team_members/{teamId}_{userId} 생성 (승인 Callable과 동일 docId)
 * - teams.memberCount = members 서브컬렉션 실제 개수
 *
 * onDelete:
 * - team_members 역인덱스 삭제(신·구 docId)
 * - teams.memberCount 재계산
 * 
 * onUpdate:
 * - team_members.role 업데이트 (role 변경 시)
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";

const db = getFirestore();
const logger = functions.logger;

/** members 문서에 표시 이름이 없을 때 users / Auth 에서 보강 */
async function backfillMemberDisplayFieldsIfMissing(
  teamId: string,
  uid: string,
  memberData: DocumentData,
  memberRef: DocumentReference
): Promise<DocumentData> {
  const has =
    (typeof memberData.name === "string" && memberData.name.trim()) ||
    (typeof memberData.displayName === "string" && memberData.displayName.trim()) ||
    (typeof memberData.userName === "string" && memberData.userName.trim());
  if (has) {
    return memberData;
  }

  let resolved = "";
  try {
    const us = await db.doc(`users/${uid}`).get();
    if (us.exists) {
      const u = us.data() as Record<string, unknown>;
      const v =
        (typeof u.displayName === "string" && u.displayName.trim()) ||
        (typeof u.name === "string" && u.name.trim()) ||
        (typeof u.nickname === "string" && u.nickname.trim()) ||
        (typeof u.userName === "string" && u.userName.trim()) ||
        "";
      if (v) resolved = v;
      if (!resolved && typeof u.email === "string" && u.email.includes("@")) {
        resolved = String(u.email.split("@")[0] || "").trim();
      }
    }
  } catch (e: any) {
    logger.warn("⚠️ [backfillMemberDisplay] users 읽기 실패:", { uid, err: e?.message });
  }

  if (!resolved) {
    try {
      const au = await admin.auth().getUser(uid);
      if (au.displayName?.trim()) resolved = au.displayName.trim();
      else if (au.email?.includes("@")) {
        resolved = au.email.split("@")[0]?.trim() ?? "";
      }
    } catch (e: any) {
      logger.warn("⚠️ [backfillMemberDisplay] Auth getUser 실패:", { uid, err: e?.message });
    }
  }

  if (!resolved) {
    return memberData;
  }

  const patch = { name: resolved, displayName: resolved, userName: resolved };
  try {
    await memberRef.set(patch, { merge: true });
  } catch (e: any) {
    logger.warn("⚠️ [backfillMemberDisplay] members 문서 보강 실패:", { teamId, uid, err: e?.message });
    return memberData;
  }
  return { ...memberData, ...patch };
}

/**
 * 팀 멤버 생성 시 동기화
 * 
 * Trigger: teams/{teamId}/members/{uid} onCreate
 * 
 * Actions:
 * 1. team_members/{userId}_{teamId} 인덱스 생성
 * 2. teams/{teamId}.memberCount 증가
 */
export const onTeamMemberCreate = functions.firestore
  .document("teams/{teamId}/members/{uid}")
  .onCreate(async (snap, context) => {
    const { teamId, uid } = context.params;
    let memberData = snap.data();

    try {
      memberData = await backfillMemberDisplayFieldsIfMissing(teamId, uid, memberData, snap.ref);
    } catch (e: any) {
      logger.warn("⚠️ [onTeamMemberCreate] 표시 이름 백필 스킵:", { teamId, uid, err: e?.message });
    }

    logger.info("🔄 [onTeamMemberCreate] 팀 멤버 생성 감지:", {
      teamId,
      uid,
      role: memberData.role,
      status: memberData.status,
    });

    try {
      const statusRaw = String(memberData.status ?? "active").toLowerCase();
      const isActive = !statusRaw || statusRaw === "active";
      const explicitUserId =
        typeof memberData.userId === "string" && memberData.userId.trim()
          ? String(memberData.userId).trim()
          : "";

      // invited 등: 역인덱스는 두지 않고 memberCount만 갱신
      if (isActive && (explicitUserId || uid)) {
        const userIdForIndex = explicitUserId || uid;
        const indexDocId = `${teamId}_${userIdForIndex}`;
        const legacyIndexRef = db.doc(`team_members/${userIdForIndex}_${teamId}`);

        await db.doc(`team_members/${indexDocId}`).set(
          {
            teamId,
            userId: userIdForIndex,
            uid: userIdForIndex,
            role: memberData.role || "member",
            status: memberData.status || "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            joinedAt: memberData.joinedAt || admin.firestore.FieldValue.serverTimestamp(),
            displayName: memberData.displayName || memberData.name || memberData.userName || "",
            name: memberData.name || memberData.displayName || memberData.userName || "",
            userName: memberData.userName || memberData.displayName || memberData.name || "",
            email: memberData.email || "",
            userEmail: memberData.userEmail || memberData.email || "",
          },
          { merge: true }
        );

        try {
          await legacyIndexRef.delete();
        } catch {
          // 레거시 문서 없음 — 무시
        }

        logger.info("✅ [onTeamMemberCreate] team_members 인덱스 생성 완료:", {
          indexDocId,
          teamId,
          userId: userIdForIndex,
        });
      } else {
        logger.info("ℹ️ [onTeamMemberCreate] 비활성/무userId 멤버 — team_members 생략:", {
          teamId,
          uid,
          status: memberData.status,
        });
      }

      const teamRef = db.doc(`teams/${teamId}`);
      const membersSnap = await db.collection(`teams/${teamId}/members`).get();
      await teamRef.set(
        {
          memberCount: membersSnap.size,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("✅ [onTeamMemberCreate] memberCount 재계산 완료:", {
        teamId,
        memberCount: membersSnap.size,
      });
    } catch (error: any) {
      logger.error("❌ [onTeamMemberCreate] 동기화 실패:", {
        teamId,
        uid,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 원본 데이터는 유지 (멤버 생성은 성공)
    }
  });

/**
 * 팀 멤버 삭제 시 동기화
 * 
 * Trigger: teams/{teamId}/members/{uid} onDelete
 * 
 * Actions:
 * 1. team_members/{userId}_{teamId} 인덱스 삭제
 * 2. teams/{teamId}.memberCount 감소
 */
export const onTeamMemberDelete = functions.firestore
  .document("teams/{teamId}/members/{uid}")
  .onDelete(async (snap, context) => {
    const { teamId, uid } = context.params;
    const memberData = snap.data();

    logger.info("🔄 [onTeamMemberDelete] 팀 멤버 삭제 감지:", {
      teamId,
      uid,
      role: memberData.role,
    });

    try {
      const userId = memberData.userId || uid;
      const primaryId = `${teamId}_${userId}`;
      const legacyId = `${userId}_${teamId}`;

      await Promise.all([
        db.doc(`team_members/${primaryId}`).delete().catch(() => undefined),
        db.doc(`team_members/${legacyId}`).delete().catch(() => undefined),
      ]);

      logger.info("✅ [onTeamMemberDelete] team_members 인덱스 삭제 완료:", {
        primaryId,
        legacyId,
        teamId,
        userId,
      });

      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();

      if (teamSnap.exists) {
        const membersSnap = await db.collection(`teams/${teamId}/members`).get();
        await teamRef.set(
          {
            memberCount: membersSnap.size,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        logger.info("✅ [onTeamMemberDelete] memberCount 재계산 완료:", {
          teamId,
          memberCount: membersSnap.size,
        });
      } else {
        logger.warn("⚠️ [onTeamMemberDelete] 팀 문서가 없음:", { teamId });
      }
    } catch (error: any) {
      logger.error("❌ [onTeamMemberDelete] 동기화 실패:", {
        teamId,
        uid,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 원본 데이터는 유지 (멤버 삭제는 성공)
    }
  });

/**
 * 팀 멤버 업데이트 시 동기화
 * 
 * Trigger: teams/{teamId}/members/{uid} onUpdate
 * 
 * Actions:
 * 1. team_members 역인덱스(role/status/accessLevel/isDeleted/feePlan 등) 반영
 * 2. teams.updatedAt 갱신 (위 필드·회비플랜·소프트삭제 등 운영 의미 변경 시)
 */
export const onTeamMemberUpdate = functions.firestore
  .document("teams/{teamId}/members/{uid}")
  .onUpdate(async (change, context) => {
    const { teamId, uid } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    logger.info("🔄 [onTeamMemberUpdate] 팀 멤버 업데이트 감지:", {
      teamId,
      uid,
      beforeRole: beforeData.role,
      afterRole: afterData.role,
      beforeStatus: beforeData.status,
      afterStatus: afterData.status,
    });

    try {
      const explicitAfterUserId =
        typeof afterData.userId === "string" && afterData.userId.trim()
          ? String(afterData.userId).trim()
          : "";
      const userId = explicitAfterUserId || uid;
      const indexDocId = `${teamId}_${userId}`;
      const indexRef = db.doc(`team_members/${indexDocId}`);

      // 변경사항 확인 (role/status만 보면 accessLevel·soft-delete 등에서 teams가 안 찍힘)
      const roleChanged = beforeData.role !== afterData.role;
      const statusChanged = beforeData.status !== afterData.status;
      const accessLevelChanged = beforeData.accessLevel !== afterData.accessLevel;
      const isDeletedChanged = beforeData.isDeleted !== afterData.isDeleted;
      const feePlanChanged = beforeData.feePlan !== afterData.feePlan;

      const shouldSyncIndex =
        roleChanged || statusChanged || accessLevelChanged || isDeletedChanged || feePlanChanged;

      if (!shouldSyncIndex) {
        logger.info("ℹ️ [onTeamMemberUpdate] 인덱스/팀 동기화 대상 변경 없음:", {
          teamId,
          uid,
        });
        return;
      }

      // 1️⃣ team_members 인덱스 업데이트
      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (roleChanged) {
        updateData.role = afterData.role;
        logger.info("🔄 [onTeamMemberUpdate] role 변경:", {
          teamId,
          uid,
          oldRole: beforeData.role,
          newRole: afterData.role,
        });
      }

      if (statusChanged) {
        updateData.status = afterData.status;
        logger.info("🔄 [onTeamMemberUpdate] status 변경:", {
          teamId,
          uid,
          oldStatus: beforeData.status,
          newStatus: afterData.status,
        });

        // status가 active가 아니면 인덱스 삭제 (선택적)
        // 또는 유지하고 status만 업데이트 (현재는 유지)
      }

      if (accessLevelChanged && afterData.accessLevel !== undefined) {
        updateData.accessLevel = afterData.accessLevel;
      }
      if (feePlanChanged && afterData.feePlan !== undefined) {
        updateData.feePlan = afterData.feePlan;
      }
      if (isDeletedChanged && afterData.isDeleted !== undefined) {
        updateData.isDeleted = afterData.isDeleted;
      }

      await indexRef.set(
        {
          teamId,
          userId,
          uid: userId,
          ...updateData,
        },
        { merge: true }
      );

      await db.doc(`teams/${teamId}`).set(teamDocumentActivityPatch(), { merge: true });

      logger.info("✅ [onTeamMemberUpdate] team_members 인덱스 업데이트 완료:", {
        indexDocId,
        teamId,
        userId,
        updates: Object.keys(updateData),
      });
    } catch (error: any) {
      logger.error("❌ [onTeamMemberUpdate] 동기화 실패:", {
        teamId,
        uid,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 원본 데이터는 유지 (멤버 업데이트는 성공)
    }
  });
