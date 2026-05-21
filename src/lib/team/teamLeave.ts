/**
 * 🔥 팀원 탈퇴/추방/해체 관리 (STEP: 팀원 가입 플로우)
 * 
 * 핵심 원칙:
 * - 데이터 변경만으로 Persona 자동 전이
 * - role 변경 없음
 * - 강제 리다이렉트 없음
 * - 팀 해체는 상태 전환 (삭제 아님)
 */

import {
  doc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";

/**
 * 팀원이 스스로 탈퇴
 */
export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  // 1️⃣ teams/{teamId}/members/{userId} 삭제
  const memberRef = doc(db, `teams/${teamId}/members`, userId);
  await deleteDoc(memberRef);

  // 2️⃣ team_members 역인덱스 삭제
  const teamMemberRef = doc(db, "team_members", `${teamId}_${userId}`);
  await deleteDoc(teamMemberRef);

  await updateTeamDocument(teamId, {});
}

/**
 * 팀장이 팀원 추방
 */
export async function removeTeamMember(
  teamId: string,
  memberId: string
): Promise<void> {
  // 탈퇴와 동일한 로직
  await leaveTeam(teamId, memberId);
}

/**
 * 🔥 팀 해체 (팀장만 가능)
 * 
 * 핵심 원칙:
 * - 팀 삭제가 아니라 상태 전환
 * - 모든 팀원의 team_members 역인덱스 삭제
 * - 해체 후 모든 팀원이 자동으로 P1로 전이
 */
export async function disbandTeam(teamId: string): Promise<void> {
  // 1️⃣ 모든 팀원의 team_members 역인덱스 조회 및 삭제
  const teamMembersRef = collection(db, "team_members");
  const teamMembersSnap = await getDocs(teamMembersRef);
  
  const teamMemberDocs = teamMembersSnap.docs.filter(
    (doc) => doc.data().teamId === teamId
  );

  // 모든 팀원의 team_members 역인덱스 삭제
  await Promise.all(
    teamMemberDocs.map((doc) => deleteDoc(doc.ref))
  );

  // 2️⃣ teams/{teamId}/members 서브컬렉션의 모든 멤버 삭제
  const membersRef = collection(db, `teams/${teamId}/members`);
  const membersSnap = await getDocs(membersRef);
  
  await Promise.all(
    membersSnap.docs.map((doc) => deleteDoc(doc.ref))
  );

  // 3️⃣ 팀 상태를 DISBANDED로 전환 (삭제 아님)
  await updateTeamDocument(teamId, {
    status: "DISBANDED",
    disbandedAt: serverTimestamp(),
  });
}
