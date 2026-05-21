/**
 * 🔥 Team Player 서비스
 * 
 * 역할:
 * - 팀 선수 목록 조회
 * - Event Entry 기반 선수 목록 조회
 */

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** SoT 멤버 문서에서 표시용 이름 (users 조회 전) */
function nameFromMemberDoc(data: Record<string, unknown>): string | undefined {
  return (
    str(data.displayName) ||
    str(data.name) ||
    str(data.userName) ||
    str(data.nickname)
  );
}

/** users/{uid} 조회에 쓸 Auth UID — addDoc 멤버는 문서 ID가 random/local 일 수 있음 */
function profileUidForMember(data: Record<string, unknown>, memberDocId: string): string {
  return str(data.userId) || str(data.uid) || memberDocId;
}

/**
 * 팀 선수 정보
 */
export interface TeamPlayer {
  id: string;              // playerId 또는 member UID
  name: string;
  email?: string;
  photoURL?: string;
  position?: string;
  jerseyNumber?: string;
}

/**
 * 팀 멤버 목록 조회 (teams/{teamId}/members)
 */
export async function getTeamMembers(teamId: string): Promise<TeamPlayer[]> {
  try {
    const membersRef = collection(db, "teams", teamId, "members");
    const membersSnap = await getDocs(membersRef);

    const players: TeamPlayer[] = [];

    for (const memberDoc of membersSnap.docs) {
      const memberData = memberDoc.data() as Record<string, unknown>;

      // 삭제된 멤버 제외
      if (memberData.isDeleted === true) {
        continue;
      }

      const memberRowId = memberDoc.id;
      const profileUid = profileUidForMember(memberData, memberRowId);
      const fromMember = nameFromMemberDoc(memberData);

      // 사용자 정보 조회 (문서의 userId/uid 기준 — 문서 ID가 local_* 이어도 대응)
      try {
        const userDoc = await getDoc(doc(db, "users", profileUid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as Record<string, unknown>;
          const fromUser =
            str(userData.displayName) ||
            str(userData.name) ||
            str(userData.nickname) ||
            (typeof userData.email === "string" ? userData.email.split("@")[0] : undefined);
          const email = typeof userData.email === "string" ? userData.email : undefined;
          players.push({
            id: memberRowId,
            name: fromMember || fromUser || profileUid,
            email,
            photoURL: str(userData.photoURL) || str(userData.avatar),
            position: str(userData.position) || str(memberData.position),
            jerseyNumber:
              userData.jerseyNumber !== undefined && userData.jerseyNumber !== null
                ? String(userData.jerseyNumber)
                : memberData.jerseyNumber !== undefined && memberData.jerseyNumber !== null
                  ? String(memberData.jerseyNumber)
                  : undefined,
          });
        } else {
          players.push({
            id: memberRowId,
            name:
              fromMember ||
              (profileUid.startsWith("local_") ? "로컬/미연동 선수" : profileUid),
          });
        }
      } catch (error) {
        console.error(`[getTeamMembers] 사용자 ${profileUid} 조회 실패:`, error);
        players.push({
          id: memberRowId,
          name: fromMember || (profileUid.startsWith("local_") ? "로컬/미연동 선수" : profileUid),
        });
      }
    }

    return players;
  } catch (error: any) {
    console.error("[getTeamMembers] 팀 멤버 조회 실패:", error);
    
    // 권한 에러는 빈 배열 반환
    if (error?.code === "permission-denied" || error?.code === "missing-or-insufficient-permissions") {
      return [];
    }
    
    throw error;
  }
}

/**
 * Event Entry 기반 팀 선수 목록 조회
 * 
 * Event Entry의 teamId를 사용하여 팀 멤버를 조회합니다.
 */
export async function getEventTeamPlayers(teamId: string): Promise<TeamPlayer[]> {
  return getTeamMembers(teamId);
}
