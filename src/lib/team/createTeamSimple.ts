/**
 * 🔥 createTeamSimple - 간단한 팀 생성 함수 (프로필 저장 후 팀 생성)
 * 
 * 핵심 원칙:
 * - 4단계 생성
 * - teams/{teamId} 생성
 * - teams/{teamId}/members/{uid} 생성
 * - team_members/{uid}_{teamId} 역인덱스 생성
 * - users/{uid}/teamMemberships/{teamId} 미러 생성
 * 
 * ⚠️ 주의: 복잡한 권한/트랜잭션이 필요하면 Cloud Function 사용 권장
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { resolveTeamMemberProfileFields } from "@/lib/team/resolveTeamMemberProfileFields";
import { createTeamActivity } from "@/services/activity/activityFactory";
import { TEAM_ROLES } from "./roleConstants";
import { TEAM_MEMBERSHIPS } from "./membershipConstants";
import { getRegionCode } from "./regionCode";

export interface CreateTeamInput {
  name: string;
  sport: string;
  region: string;
  ownerUid: string; // 🔥 v1: leaderId → ownerUid로 통일
  /** 있으면 members 문서에 표시 이름 즉시 기록(Auth·users 우선) */
  authUser?: User | null;
}

export async function createTeamSimple({
  name,
  sport,
  region,
  ownerUid, // 🔥 v1: leaderId → ownerUid로 통일
  authUser,
}: CreateTeamInput): Promise<string> {
  if (!ownerUid) {
    throw new Error("NO_OWNER_UID");
  }

  // 1️⃣ teams/{teamId}
  const trimmedRegion = region.trim();
  const ownerIsAnonymous = Boolean(authUser?.isAnonymous);

  const teamRef = await addDoc(collection(db, "teams"), {
    name: name.trim(),
    sport,
    region: trimmedRegion, // 한글 지역명 (사용자 표시용)
    regionCode: getRegionCode(trimmedRegion), // 🔥 기계 최적화 지역 코드 (검색/매칭용)
    ownerUid, // 🔥 v1: ownerUid만 사용 (leaderId 제거)
    ...(ownerIsAnonymous ? { ownerIsAnonymous: true } : {}),
    status: "active", // 팀 활성/비활성 상태
    membership: TEAM_MEMBERSHIPS.NON_MEMBER, // 🔥 Canonical policy field: 기본값 non-member
    associationId: null, // 협회 ID (pending/member일 때만 값 있음)
    memberCount: 1, // 🔥 Denormalized member count (creator is first member)
    // ⚠️ memberCount는 Cloud Functions에서 자동 업데이트됩니다.
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const teamId = teamRef.id;

  const memberProfile = await resolveTeamMemberProfileFields(db, ownerUid, authUser ?? null);

  // 2️⃣ teams/{teamId}/members/{uid}
  await setDoc(
    doc(db, "teams", teamId, "members", ownerUid),
    {
      userId: ownerUid, // 🔥 userId만 사용 (uid 제거)
      role: TEAM_ROLES.OWNER, // 🔥 플랫폼 표준 상수 사용
      status: "active",
      joinedAt: serverTimestamp(),
      ...(ownerIsAnonymous ? { isGuestAccount: true } : {}),
      ...(memberProfile ?? {}),
    }
  );

  // 3️⃣ team_members/{uid}_{teamId} (역인덱스)
  await setDoc(
    doc(db, "team_members", `${ownerUid}_${teamId}`),
    {
      teamId, // 🔥 핵심: teamRef.id와 반드시 일치
      userId: ownerUid, // 🔥 userId만 사용 (uid 제거)
      role: TEAM_ROLES.OWNER, // 🔥 플랫폼 표준 상수 사용
      status: "active",
      createdAt: serverTimestamp(),
      joinedAt: serverTimestamp(),
      ...(memberProfile
        ? {
            displayName: memberProfile.displayName,
            name: memberProfile.name,
            userName: memberProfile.userName,
          }
        : {}),
    }
  );

  // 4️⃣ users/{uid}/teamMemberships/{teamId} (클라이언트 미러)
  await setDoc(
    doc(db, "users", ownerUid, "teamMemberships", teamId),
    {
      teamId,
      role: TEAM_ROLES.OWNER,
      status: "active",
      teamName: name.trim(),
      teamRegion: trimmedRegion,
      teamType: "normal",
      sportType: sport,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  try {
    await createTeamActivity({
      teamId,
      authorId: ownerUid,
      teamName: name.trim(),
      sport: (sport || "soccer").toLowerCase().trim(),
    });
    console.log("✅ [createTeamSimple] activities 기록 완료");
  } catch (err) {
    console.warn("⚠️ [createTeamSimple] activities 기록 실패 (무시):", err);
  }

  return teamId;
}
