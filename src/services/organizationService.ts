/**
 * 🔥 Organization 서비스
 * 
 * 역할:
 * - Organization 생성/조회
 * - Organization 멤버 관리
 * - Organization별 Event 조회
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type {
  Organization,
  OrganizationMember,
  OrganizationRole,
  CreateOrganizationInput,
} from "@/types/organization";

/**
 * Organization 생성
 */
export async function createOrganization(
  input: CreateOrganizationInput
): Promise<string> {
  const orgData: Omit<Organization, "id" | "createdAt" | "updatedAt"> = {
    name: input.name,
    type: input.type,
    level: input.level,
    parentOrgId: input.parentOrgId || null,
    regionCode: input.regionCode,
    sportType: input.sportType,
    status: "active",
    description: input.description,
    createdBy: input.createdBy,
  };

  const orgRef = await addDoc(collection(db, "organizations"), {
    ...orgData,
    createdAt: serverTimestamp(),
  });

  // 생성자를 Organization Admin으로 추가
  await addOrganizationMember(orgRef.id, input.createdBy, "organization_admin");

  return orgRef.id;
}

/**
 * Organization 조회
 */
export async function getOrganization(
  orgId: string
): Promise<Organization | null> {
  const orgDoc = await getDoc(doc(db, "organizations", orgId));

  if (!orgDoc.exists()) {
    return null;
  }

  return { id: orgDoc.id, ...orgDoc.data() } as Organization;
}

/**
 * Organization 목록 조회
 */
export async function getOrganizations(options?: {
  parentOrgId?: string;
  regionCode?: string;
  sportType?: string;
  type?: Organization["type"];
}): Promise<Organization[]> {
  let q: any = collection(db, "organizations");

  if (options?.parentOrgId) {
    q = query(q, where("parentOrgId", "==", options.parentOrgId));
  }

  if (options?.regionCode) {
    q = query(q, where("regionCode", "==", options.regionCode));
  }

  if (options?.sportType) {
    q = query(q, where("sportType", "==", options.sportType));
  }

  if (options?.type) {
    q = query(q, where("type", "==", options.type));
  }

  q = query(q, where("status", "==", "active"));
  q = query(q, orderBy("name", "asc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Organization[];
}

/**
 * Organization 멤버 추가
 */
export async function addOrganizationMember(
  orgId: string,
  userId: string,
  role: OrganizationRole,
  userName?: string
): Promise<void> {
  const memberId = `${orgId}_${userId}`;
  const memberRef = doc(db, "organization_members", memberId);

  await setDoc(
    memberRef,
    {
      organizationId: orgId,
      userId,
      userName: userName || null,
      role,
      status: "active",
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Organization 멤버 조회
 */
export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMember[]> {
  const q = query(
    collection(db, "organization_members"),
    where("organizationId", "==", orgId),
    where("status", "==", "active"),
    orderBy("joinedAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrganizationMember[];
}

/**
 * Organization 멤버 역할 변경
 */
export async function updateOrganizationMemberRole(
  orgId: string,
  userId: string,
  newRole: OrganizationRole
): Promise<void> {
  const fn = httpsCallable<
    { organizationId: string; targetUserId: string; newRole: string },
    { ok: boolean }
  >(functions, "syncOrganizationMemberRole");
  await fn({
    organizationId: orgId,
    targetUserId: userId,
    newRole,
  });
}

/**
 * Organization 멤버 제거
 */
export async function removeOrganizationMember(
  orgId: string,
  userId: string
): Promise<void> {
  const memberId = `${orgId}_${userId}`;
  const memberRef = doc(db, "organization_members", memberId);

  await updateDoc(memberRef, {
    status: "inactive",
    updatedAt: serverTimestamp(),
  });
}

/**
 * 사용자의 Organization 목록 조회
 */
export async function getUserOrganizations(
  userId: string
): Promise<Organization[]> {
  const q = query(
    collection(db, "organization_members"),
    where("userId", "==", userId),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);
  const orgIds = snapshot.docs.map((doc) => doc.data().organizationId);

  if (orgIds.length === 0) {
    return [];
  }

  // Organization 정보 조회
  const orgPromises = orgIds.map((orgId) => getOrganization(orgId));
  const orgs = await Promise.all(orgPromises);

  return orgs.filter((org): org is Organization => org !== null);
}
