/**
 * 🔥 팀 완전 삭제 함수 (v1 아키텍처)
 * 
 * 역할:
 * - 팀 삭제 시 관련된 모든 데이터 삭제
 * - 데이터 일관성 보장
 * - Ghost team 방지
 * 
 * 삭제 대상:
 * 1. teams/{teamId} 문서
 * 2. teams/{teamId}/members/* 전체
 * 3. activities where refId == teamId (팀 관련 활동)
 * 4. inviteLinks where teamId == teamId
 * 5. team_members 역인덱스 (${teamId}_${uid})
 * 
 * ⚠️ 주의: 이 함수는 물리 삭제를 수행합니다. 되돌릴 수 없습니다.
 */

import {
  doc,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 팀 완전 삭제
 * 
 * @param teamId - 삭제할 팀 ID
 * @param userId - 삭제를 요청한 사용자 ID (권한 확인용)
 * @throws Error - 권한 없음, 팀 없음, 삭제 실패
 */
export async function deleteTeam(teamId: string, userId: string): Promise<void> {
  if (!teamId || !userId) {
    throw new Error("팀 ID와 사용자 ID가 필요합니다.");
  }

  console.log("🔥 [deleteTeam] 팀 삭제 시작:", { teamId, userId });

  // 1️⃣ 팀 문서 존재 여부 및 권한 확인
  const teamRef = doc(db, "teams", teamId);
  const { getDoc } = await import("firebase/firestore");
  const teamDoc = await getDoc(teamRef);
  
  if (!teamDoc.exists()) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  // owner 권한 확인
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberDoc = await getDoc(memberRef);
  
  if (!memberDoc.exists()) {
    throw new Error("팀 삭제 권한이 없습니다. 팀장만 삭제할 수 있습니다.");
  }

  const memberData = memberDoc.data();
  if (memberData.role !== "owner") {
    throw new Error("팀 삭제 권한이 없습니다. 팀장만 삭제할 수 있습니다.");
  }

  // 2️⃣ 배치 작업으로 모든 데이터 삭제
  const batch = writeBatch(db);

  // 2-1. teams/{teamId}/members/* 전체 삭제
  const membersRef = collection(db, "teams", teamId, "members");
  const membersSnap = await getDocs(membersRef);
  membersSnap.docs.forEach((memberDoc) => {
    batch.delete(memberDoc.ref);
  });
  console.log(`✅ [deleteTeam] ${membersSnap.size}개 멤버 문서 삭제 예정`);

  // 2-2. team_members 역인덱스 삭제 (${teamId}_${uid})
  const teamMembersRef = collection(db, "team_members");
  const teamMembersQuery = query(teamMembersRef, where("teamId", "==", teamId));
  const teamMembersSnap = await getDocs(teamMembersQuery);
  teamMembersSnap.docs.forEach((teamMemberDoc) => {
    batch.delete(teamMemberDoc.ref);
  });
  console.log(`✅ [deleteTeam] ${teamMembersSnap.size}개 team_members 역인덱스 삭제 예정`);

  // 2-3. activities 삭제 (팀 관련 활동)
  const activitiesRef = collection(db, "activities");
  const activitiesQuery = query(
    activitiesRef,
    where("refId", "==", teamId),
    where("refType", "in", ["teams", "notices", "events"])
  );
  const activitiesSnap = await getDocs(activitiesQuery);
  activitiesSnap.docs.forEach((activityDoc) => {
    batch.delete(activityDoc.ref);
  });
  console.log(`✅ [deleteTeam] ${activitiesSnap.size}개 활동 삭제 예정`);

  // 2-4. inviteLinks 삭제
  const inviteLinksRef = collection(db, "inviteLinks");
  const inviteLinksQuery = query(inviteLinksRef, where("teamId", "==", teamId));
  const inviteLinksSnap = await getDocs(inviteLinksQuery);
  inviteLinksSnap.docs.forEach((inviteLinkDoc) => {
    batch.delete(inviteLinkDoc.ref);
  });
  console.log(`✅ [deleteTeam] ${inviteLinksSnap.size}개 초대 링크 삭제 예정`);

  // 2-5. teams/{teamId} 문서 삭제 (마지막)
  batch.delete(teamRef);

  // 3️⃣ 배치 커밋
  await batch.commit();

  console.log("✅ [deleteTeam] 팀 삭제 완료:", {
    teamId,
    deletedMembers: membersSnap.size,
    deletedTeamMembers: teamMembersSnap.size,
    deletedActivities: activitiesSnap.size,
    deletedInviteLinks: inviteLinksSnap.size,
  });
}
