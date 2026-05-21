/**
 * 조직 멤버 역할 변경 + users.organizationRoles — 서버 권한 검증
 */
import type { DocumentReference } from "firebase-admin/firestore";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";
const db = getFirestore();

const MANAGE_ROLES = new Set([
  "super_admin",
  "organization_admin",
  "org_admin",
  "association_admin",
]);

const ALLOWED_TARGET_ROLES = new Set([
  "super_admin",
  "organization_admin",
  "org_admin",
  "association_admin",
  "event_manager",
  "stats_manager",
  "referee",
  "viewer",
]);

export type SyncOrganizationMemberRoleRequest = {
  newRole: string;
  memberId?: string;
  organizationId?: string;
  targetUserId?: string;
};

export type SyncOrganizationMemberRoleResponse = { ok: boolean };

async function canManageOrganization(callerUid: string, organizationId: string): Promise<boolean> {
  const orgSnap = await db.doc(`organizations/${organizationId}`).get();
  if (orgSnap.exists) {
    const createdBy = orgSnap.data()?.createdBy;
    if (typeof createdBy === "string" && createdBy === callerUid) {
      return true;
    }
  }

  const quickId = `${organizationId}_${callerUid}`;
  const memQuick = await db.doc(`organization_members/${quickId}`).get();
  if (memQuick.exists) {
    const d = memQuick.data() ?? {};
    if (d.status === "active" && typeof d.role === "string" && MANAGE_ROLES.has(d.role)) {
      return true;
    }
  }

  const q = await db
    .collection("organization_members")
    .where("organizationId", "==", organizationId)
    .where("userId", "==", callerUid)
    .where("status", "==", "active")
    .limit(3)
    .get();

  for (const doc of q.docs) {
    const role = doc.data()?.role;
    if (typeof role === "string" && MANAGE_ROLES.has(role)) {
      return true;
    }
  }

  const userSnap = await db.doc(`users/${callerUid}`).get();
  if (userSnap.exists && String(userSnap.data()?.role || "").toUpperCase() === "ADMIN") {
    return true;
  }

  return false;
}

export const syncOrganizationMemberRole = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<SyncOrganizationMemberRoleResponse> => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const data = request.data as Partial<SyncOrganizationMemberRoleRequest>;
    const newRole = typeof data.newRole === "string" ? data.newRole.trim() : "";
    if (!newRole || !ALLOWED_TARGET_ROLES.has(newRole)) {
      throw new HttpsError("invalid-argument", "유효하지 않은 역할입니다.");
    }

    let memberRef: DocumentReference;
    const memberId = typeof data.memberId === "string" ? data.memberId.trim() : "";
    const organizationId = typeof data.organizationId === "string" ? data.organizationId.trim() : "";
    const targetUserId = typeof data.targetUserId === "string" ? data.targetUserId.trim() : "";

    if (memberId) {
      memberRef = db.doc(`organization_members/${memberId}`);
    } else if (organizationId && targetUserId) {
      memberRef = db.doc(`organization_members/${organizationId}_${targetUserId}`);
    } else {
      throw new HttpsError("invalid-argument", "memberId 또는 organizationId+targetUserId가 필요합니다.");
    }

    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new HttpsError("not-found", "조직 멤버를 찾을 수 없습니다.");
    }

    const m = memberSnap.data() ?? {};
    const orgId = typeof m.organizationId === "string" ? m.organizationId : "";
    const userId = typeof m.userId === "string" ? m.userId : "";
    if (!orgId || !userId) {
      throw new HttpsError("failed-precondition", "멤버 문서가 올바르지 않습니다.");
    }

    if (!(await canManageOrganization(callerUid, orgId))) {
      throw new HttpsError("permission-denied", "조직 관리 권한이 없습니다.");
    }

    try {
      await db.runTransaction(async (tx) => {
        const m2 = await tx.get(memberRef);
        if (!m2.exists) {
          throw new Error("NOT_FOUND");
        }
        tx.set(
          memberRef,
          {
            role: newRole,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const userRef = db.doc(`users/${userId}`);
        const userSnap = await tx.get(userRef);
        if (userSnap.exists) {
          const prevRoles = (userSnap.data()?.organizationRoles as Record<string, string> | undefined) ?? {};
          const nextRoles = { ...prevRoles, [orgId]: newRole };
          tx.set(
            userRef,
            {
              organizationRoles: nextRoles,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NOT_FOUND") {
        throw new HttpsError("not-found", "조직 멤버를 찾을 수 없습니다.");
      }
      logger.error("syncOrganizationMemberRole failed", e);
      throw new HttpsError("internal", "역할 변경에 실패했습니다.");
    }

    return { ok: true };
  }
);
