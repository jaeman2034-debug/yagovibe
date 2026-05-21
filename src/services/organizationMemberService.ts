/**
 * 🔥 Organization Member 서비스
 * 
 * 역할:
 * - Organization 멤버 조회
 * - 멤버 초대
 * - 역할 변경
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type { OrganizationRole } from "@/utils/organizationPermissions";

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  role: OrganizationRole;
  status: "active" | "inactive" | "pending";
  invitedBy?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: any;
  createdAt: any;
}

/**
 * Organization 멤버 목록 조회
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  try {
    const q = query(
      collection(db, "organization_members"),
      where("organizationId", "==", organizationId),
      where("status", "==", "active")
    );

    const snapshot = await getDocs(q);
    const members: OrganizationMember[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const userId = data.userId;

      // 사용자 정보 조회
      let userEmail: string | undefined;
      let userName: string | undefined;

      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userEmail = userData.email;
          userName = userData.displayName || userData.name;
        }
      } catch (error) {
        // 사용자 조회 실패해도 계속 진행
      }

      members.push({
        id: docSnap.id,
        organizationId: data.organizationId,
        userId,
        userEmail,
        userName,
        role: data.role,
        status: data.status,
        invitedBy: data.invitedBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }

    return members;
  } catch (error) {
    console.error("[getOrganizationMembers] 조회 실패:", error);
    return [];
  }
}

/**
 * Organization 멤버 초대
 */
export async function inviteOrganizationMember(input: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
}): Promise<string> {
  try {
    // organization_invites에 초대 생성
    const inviteRef = await addDoc(collection(db, "organization_invites"), {
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      invitedBy: input.invitedBy,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후 만료
      createdAt: serverTimestamp(),
    });

    // TODO: 이메일 발송 (Cloud Function 또는 외부 서비스)

    return inviteRef.id;
  } catch (error) {
    console.error("[inviteOrganizationMember] 초대 실패:", error);
    throw error;
  }
}

/**
 * Organization 멤버 역할 변경
 */
export async function updateOrganizationMemberRole(
  memberId: string,
  newRole: OrganizationRole
): Promise<void> {
  try {
    const fn = httpsCallable<
      { memberId: string; newRole: string },
      { ok: boolean }
    >(functions, "syncOrganizationMemberRole");
    await fn({ memberId, newRole });
  } catch (error) {
    console.error("[updateOrganizationMemberRole] 역할 변경 실패:", error);
    throw error;
  }
}
