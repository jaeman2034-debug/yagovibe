/**
 * 🔥 팀원 역할 변경
 * 
 * 역할:
 * - 팀 리더만 팀원의 역할을 변경할 수 있음
 * - owner 역할은 변경 불가
 * - 트랜잭션으로 원자적 처리
 */

import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamRole } from "./roleConstants";

/**
 * 팀원 역할 변경
 * 
 * @param teamId - 팀 ID
 * @param memberUid - 변경할 팀원 UID
 * @param newRole - 새로운 역할 (owner 제외)
 * @param actorUid - 변경하는 리더 UID (권한 확인용)
 */
export async function updateTeamMemberRole({
  teamId,
  memberUid,
  newRole,
  actorUid,
}: {
  teamId: string;
  memberUid: string;
  newRole: "member" | "admin"; // 🔥 소문자로 통일 (MEMBER → member)
  actorUid: string;
}): Promise<void> {
  if (!teamId || !memberUid || !newRole || !actorUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  // owner 역할 변경 금지
  if (newRole === "owner") {
    throw new Error("owner 역할은 변경할 수 없습니다.");
  }

  const memberRef = doc(db, "teams", teamId, "members", memberUid);
  const teamRef = doc(db, "teams", teamId);
  const teamMemberRef = doc(db, "team_members", `${teamId}_${memberUid}`);

  await runTransaction(db, async (transaction) => {
    // 1️⃣ 팀 정보 조회 (리더 권한 확인)
    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists()) {
      throw new Error("팀을 찾을 수 없습니다.");
    }

    const teamData = teamSnap.data();
    
    // 리더 권한 확인
    if (teamData.ownerUid !== actorUid && !(teamData.owners || []).includes(actorUid)) {
      throw new Error("권한이 없습니다. 팀 리더만 역할을 변경할 수 있습니다.");
    }

    // 2️⃣ 멤버 정보 조회
    const memberSnap = await transaction.get(memberRef);
    if (!memberSnap.exists()) {
      throw new Error("팀원을 찾을 수 없습니다.");
    }

    const memberData = memberSnap.data();
    
    // owner 역할 변경 금지
    if (memberData.role === "owner" || memberData.role === "LEADER") {
      throw new Error("owner 역할은 변경할 수 없습니다.");
    }

    // 동일한 역할로 변경 시도 방지
    if (memberData.role === newRole) {
      throw new Error("이미 해당 역할입니다.");
    }

    // 3️⃣ 멤버 역할 업데이트
    transaction.update(memberRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });

    // 4️⃣ 역인덱스 업데이트 (존재하는 경우)
    const teamMemberSnap = await transaction.get(teamMemberRef);
    if (teamMemberSnap.exists()) {
      transaction.update(teamMemberRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
    }
  });
}
