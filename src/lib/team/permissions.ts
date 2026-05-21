/**
 * 🔥 팀 권한 시스템 헬퍼 함수
 * 
 * 역할:
 * - 팀 수정 권한 체크
 * - 멤버 초대 권한 체크
 * - 활동 생성 권한 체크
 * - 공통 권한 로직 재사용
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamRole } from "./roleConstants";

export type { TeamRole };

export interface TeamMemberData {
  uid: string;
  role: TeamRole;
  accessLevel?: "OWNER" | "ADMIN" | "STAFF" | "MEMBER";
  status: "active" | "inactive" | "pending";
}

/**
 * 팀 수정 권한 체크 (Owner 또는 Admin만 가능)
 */
export async function canEditTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  try {
    // 1. 팀 문서에서 owner 확인
    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) return false;
    
    const teamData = teamSnap.data();
    
    // Owner 확인
    if (teamData.ownerUid === userId) return true;
    if (teamData.owners?.includes(userId)) return true;
    
    // 2. 멤버 문서에서 role 확인
    const memberRef = doc(db, "teams", teamId, "members", userId);
    const memberSnap = await getDoc(memberRef);
    
    if (!memberSnap.exists()) return false;
    
    const memberData = memberSnap.data() as TeamMemberData;
    
    // Owner 또는 Admin만 수정 가능
    return memberData.role === "owner" || memberData.role === "admin";
  } catch (error) {
    console.error("❌ [canEditTeam] 권한 체크 실패:", error);
    return false;
  }
}

/**
 * 멤버 초대 권한 체크 (Owner 또는 Admin만 가능)
 */
export async function canInvite(
  userId: string,
  teamId: string
): Promise<boolean> {
  // 초대 권한 = 수정 권한과 동일
  return canEditTeam(userId, teamId);
}

/**
 * 활동 생성 권한 체크 (활성 멤버 모두 가능)
 */
export async function canCreateActivity(
  userId: string,
  teamId: string
): Promise<boolean> {
  try {
    const memberRef = doc(db, "teams", teamId, "members", userId);
    const memberSnap = await getDoc(memberRef);
    
    if (!memberSnap.exists()) return false;
    
    const memberData = memberSnap.data() as TeamMemberData;
    
    // 활성 멤버면 활동 생성 가능
    return memberData.status === "active";
  } catch (error) {
    console.error("❌ [canCreateActivity] 권한 체크 실패:", error);
    return false;
  }
}

/**
 * 팀 삭제 권한 체크 (Owner만 가능)
 */
export async function canDeleteTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  try {
    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) return false;
    
    const teamData = teamSnap.data();
    
    // Owner만 삭제 가능
    return teamData.ownerUid === userId || teamData.owners?.includes(userId);
  } catch (error) {
    console.error("❌ [canDeleteTeam] 권한 체크 실패:", error);
    return false;
  }
}

/**
 * 사용자의 팀 내 역할 조회
 */
export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  try {
    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) return null;
    
    const teamData = teamSnap.data();
    
    // Owner 확인
    if (teamData.ownerUid === userId || teamData.owners?.includes(userId)) {
      return "owner";
    }
    
    // 멤버 문서에서 role 확인
    const memberRef = doc(db, "teams", teamId, "members", userId);
    const memberSnap = await getDoc(memberRef);
    
    if (!memberSnap.exists()) return null;
    
    const memberData = memberSnap.data() as TeamMemberData;
    return memberData.role || null;
  } catch (error) {
    console.error("❌ [getUserTeamRole] 역할 조회 실패:", error);
    return null;
  }
}
