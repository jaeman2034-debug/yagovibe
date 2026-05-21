/**
 * 🔥 협회-팀 연결 관리
 * 
 * 구조:
 * teams/{teamId}.associationId
 * association_teams/{associationId}_{teamId}
 * 
 * 역할:
 * - 협회 관리자만 팀을 소속/해제 가능
 * - 팀은 하나의 협회에만 소속 가능
 * - 역인덱스로 조회 성능 최적화
 */

import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 팀을 협회에 소속시키기
 */
export async function attachTeamToAssociation({
  associationId,
  teamId,
  actorUid,
}: {
  associationId: string;
  teamId: string;
  actorUid: string;
}): Promise<void> {
  if (!associationId || !teamId || !actorUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const teamRef = doc(db, "teams", teamId);
  const associationRef = doc(db, "associations", associationId);
  const indexRef = doc(db, "association_teams", `${associationId}_${teamId}`);

  await runTransaction(db, async (transaction) => {
    // 1️⃣ 협회 존재 확인 및 관리자 권한 확인
    const associationSnap = await transaction.get(associationRef);
    if (!associationSnap.exists()) {
      throw new Error("협회를 찾을 수 없습니다.");
    }

    const associationData = associationSnap.data();
    const adminUids = associationData.adminUids || [];
    
    if (!adminUids.includes(actorUid)) {
      throw new Error("권한이 없습니다. 협회 관리자만 팀을 소속시킬 수 있습니다.");
    }

    // 2️⃣ 팀 존재 확인
    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists()) {
      throw new Error("팀을 찾을 수 없습니다.");
    }

    const teamData = teamSnap.data();
    
    // 이미 다른 협회에 소속되어 있는지 확인
    if (teamData.associationId && teamData.associationId !== associationId) {
      throw new Error("팀이 이미 다른 협회에 소속되어 있습니다.");
    }

    // 이미 같은 협회에 소속되어 있는지 확인
    if (teamData.associationId === associationId) {
      throw new Error("이미 이 협회에 소속되어 있습니다.");
    }

    // 3️⃣ 팀에 associationId 설정
    transaction.update(teamRef, {
      associationId,
      updatedAt: serverTimestamp(),
    });

    // 4️⃣ 역인덱스 생성
    transaction.set(indexRef, {
      associationId,
      teamId,
      joinedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * 팀을 협회에서 해제하기
 */
export async function detachTeamFromAssociation({
  associationId,
  teamId,
  actorUid,
}: {
  associationId: string;
  teamId: string;
  actorUid: string;
}): Promise<void> {
  if (!associationId || !teamId || !actorUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const teamRef = doc(db, "teams", teamId);
  const associationRef = doc(db, "associations", associationId);
  const indexRef = doc(db, "association_teams", `${associationId}_${teamId}`);

  await runTransaction(db, async (transaction) => {
    // 1️⃣ 협회 관리자 권한 확인
    const associationSnap = await transaction.get(associationRef);
    if (!associationSnap.exists()) {
      throw new Error("협회를 찾을 수 없습니다.");
    }

    const associationData = associationSnap.data();
    const adminUids = associationData.adminUids || [];
    
    if (!adminUids.includes(actorUid)) {
      throw new Error("권한이 없습니다. 협회 관리자만 팀을 해제할 수 있습니다.");
    }

    // 2️⃣ 팀 소속 확인
    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists()) {
      throw new Error("팀을 찾을 수 없습니다.");
    }

    const teamData = teamSnap.data();
    
    if (teamData.associationId !== associationId) {
      throw new Error("이 협회에 소속되어 있지 않습니다.");
    }

    // 3️⃣ 팀에서 associationId 제거
    transaction.update(teamRef, {
      associationId: null,
      updatedAt: serverTimestamp(),
    });

    // 4️⃣ 역인덱스 삭제
    const indexSnap = await transaction.get(indexRef);
    if (indexSnap.exists()) {
      transaction.delete(indexRef);
    }
  });
}

/**
 * 협회 소속 팀 목록 조회
 */
export async function getAssociationTeams(
  associationId: string
): Promise<any[]> {
  // 역인덱스로 조회
  const { query, collection, where, getDocs } = await import("firebase/firestore");
  const q = query(
    collection(db, "association_teams"),
    where("associationId", "==", associationId)
  );
  const snap = await getDocs(q);

  const teamIds = snap.docs.map((doc) => doc.data().teamId);

  // 팀 정보 조회
  const teams = [];
  for (const teamId of teamIds) {
    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);
    if (teamSnap.exists()) {
      teams.push({
        id: teamSnap.id,
        ...teamSnap.data(),
      });
    }
  }

  return teams;
}
