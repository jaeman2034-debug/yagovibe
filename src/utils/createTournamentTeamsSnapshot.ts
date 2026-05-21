/**
 * 🔥 대회 시작 시 팀 스냅샷 생성 유틸
 * 
 * 기능:
 * - 대회 시작 시점의 팀 구성 고정
 * - 이후 팀 관리 변경과 완전히 분리
 * - 운영 중 "명단 바뀌었다" 분쟁 차단
 */

import { collection, getDocs, setDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 대회 시작 시점의 팀 구성 스냅샷 생성
 * 
 * @param associationId 협회 ID
 * @param tournamentId 대회 ID
 * 
 * 저장 위치: Associations/{associationId}/Tournaments/{tournamentId}/teamsSnapshot/{teamId}
 */
export async function createTournamentTeamsSnapshot({
  associationId,
  tournamentId,
}: {
  associationId: string;
  tournamentId: string;
}) {
  try {
    // 1️⃣ 대회에 승인된 팀들 조회
    const teamsRef = collection(
      db,
      "associations",
      associationId,
      "tournaments",
      tournamentId,
      "teams"
    );

    const approvedQuery = query(teamsRef, where("status", "==", "approved"));
    const teamsSnap = await getDocs(approvedQuery);

    if (teamsSnap.empty) {
      console.warn("[팀 스냅샷] 승인된 팀이 없습니다.");
      return;
    }

    // 2️⃣ 스냅샷 컬렉션 참조
    const snapshotRef = collection(
      db,
      "associations",
      associationId,
      "tournaments",
      tournamentId,
      "teamsSnapshot"
    );

    // 3️⃣ 각 팀의 스냅샷 생성
    const snapshotPromises = teamsSnap.docs.map(async (teamDoc) => {
      const team = teamDoc.data();

      // 팀 정보 추출
      const teamId = team.teamId || teamDoc.id;
      const teamName = team.teamName || team.name || "팀명 없음";
      
      // 멤버 정보 추출 (다양한 구조 대응)
      let members: any[] = [];
      if (team.members && Array.isArray(team.members)) {
        members = team.members.map((member: any) => ({
          name: member.name || member.displayName || "이름 없음",
          role: member.role === "captain" || member.isCaptain ? "captain" : "player",
        }));
      }

      // 스냅샷 문서 생성
      await setDoc(doc(snapshotRef, teamId), {
        teamId: teamId,
        teamName: teamName,
        members: members,
        snapshottedAt: serverTimestamp(),
      });
    });

    await Promise.all(snapshotPromises);

    console.log(`[팀 스냅샷] ✅ ${teamsSnap.docs.length}개 팀 스냅샷 생성 완료`);
  } catch (error: any) {
    console.error("[팀 스냅샷] 생성 오류:", error);
    throw new Error(`팀 스냅샷 생성 실패: ${error.message || "알 수 없는 오류"}`);
  }
}

