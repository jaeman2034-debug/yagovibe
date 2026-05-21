/**
 * 🔥 대회 참가 신청 관리
 * 
 * 구조:
 * tournamentApplications/{applicationId}
 * tournamentTeams/{tournamentId}_{teamId}
 * 
 * 역할:
 * - 팀 → 대회 참가 신청
 * - 협회 → 신청 승인/거절
 * - 참가팀 확정 (트랜잭션)
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TournamentApplicationStatus = "APPLIED" | "APPROVED" | "REJECTED";

export interface TournamentApplication {
  id: string;
  tournamentId: string;
  teamId: string;
  appliedByUid: string;
  status: TournamentApplicationStatus;
  createdAt: any;
  decidedAt?: any;
}

/**
 * 대회 참가 신청
 */
export async function applyToTournament({
  tournamentId,
  teamId,
  leaderUid,
}: {
  tournamentId: string;
  teamId: string;
  leaderUid: string;
}): Promise<string> {
  if (!tournamentId || !teamId || !leaderUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  // 1️⃣ 대회 정보 조회 (협회 ID 확인)
  const tournamentRef = doc(db, "tournaments", tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);
  
  if (!tournamentSnap.exists()) {
    throw new Error("대회를 찾을 수 없습니다.");
  }

  const tournamentData = tournamentSnap.data();
  const tournamentAssociationId = tournamentData.associationId;

  // 2️⃣ 팀 정보 조회 (협회 소속 확인)
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  
  if (!teamSnap.exists()) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const teamData = teamSnap.data();
  const teamAssociationId = teamData.associationId;

  // 3️⃣ 협회 소속 검증 (대회 주최 협회와 팀 소속 협회가 일치해야 함)
  if (tournamentAssociationId && teamAssociationId !== tournamentAssociationId) {
    throw new Error("이 협회 소속 팀만 참가할 수 있습니다.");
  }

  // 4️⃣ 중복 신청 확인
  const existingQuery = query(
    collection(db, "tournamentApplications"),
    where("tournamentId", "==", tournamentId),
    where("teamId", "==", teamId),
    where("status", "==", "APPLIED")
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    throw new Error("이미 참가 신청이 진행 중입니다.");
  }

  // 5️⃣ 신청 생성
  const appRef = await addDoc(collection(db, "tournamentApplications"), {
    tournamentId,
    teamId,
    appliedByUid: leaderUid,
    status: "APPLIED",
    createdAt: serverTimestamp(),
  });

  return appRef.id;
}

/**
 * 대회 참가 신청 승인 (트랜잭션)
 */
export async function approveTournamentApplication({
  applicationId,
  tournamentId,
  teamId,
  actorUid,
}: {
  applicationId: string;
  tournamentId: string;
  teamId: string;
  actorUid: string;
}): Promise<void> {
  if (!applicationId || !tournamentId || !teamId || !actorUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const appRef = doc(db, "tournamentApplications", applicationId);
  const teamRef = doc(db, "tournamentTeams", `${tournamentId}_${teamId}`);
  const notificationRef = doc(collection(db, "notifications"));

  await runTransaction(db, async (transaction) => {
    // 1️⃣ 신청서 조회
    const appSnap = await transaction.get(appRef);
    if (!appSnap.exists()) {
      throw new Error("신청서를 찾을 수 없습니다.");
    }

    const appData = appSnap.data();
    
    // 중복 승인 방지
    if (appData.status !== "APPLIED") {
      throw new Error("이미 처리된 신청입니다.");
    }

    // 2️⃣ 중복 참가 확인
    const teamSnap = await transaction.get(teamRef);
    if (teamSnap.exists()) {
      throw new Error("이미 참가 확정된 팀입니다.");
    }

    // 3️⃣ 신청서 승인
    transaction.update(appRef, {
      status: "APPROVED",
      decidedAt: serverTimestamp(),
      decidedBy: actorUid,
    });

    // 4️⃣ 참가팀 확정
    transaction.set(teamRef, {
      tournamentId,
      teamId,
      approvedAt: serverTimestamp(),
      approvedBy: actorUid,
    });

    // 5️⃣ 알림 생성
    transaction.set(notificationRef, {
      userId: appData.appliedByUid,
      type: "TOURNAMENT_APPROVED",
      tournamentId,
      teamId,
      message: "대회 참가가 승인되었습니다.",
      isRead: false,
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * 대회 참가 신청 거절
 */
export async function rejectTournamentApplication({
  applicationId,
  actorUid,
}: {
  applicationId: string;
  actorUid: string;
}): Promise<void> {
  if (!applicationId || !actorUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const appRef = doc(db, "tournamentApplications", applicationId);
  const notificationRef = doc(collection(db, "notifications"));

  await runTransaction(db, async (transaction) => {
    const appSnap = await transaction.get(appRef);
    if (!appSnap.exists()) {
      throw new Error("신청서를 찾을 수 없습니다.");
    }

    const appData = appSnap.data();
    
    if (appData.status !== "APPLIED") {
      throw new Error("이미 처리된 신청입니다.");
    }

    // 신청서 거절
    transaction.update(appRef, {
      status: "REJECTED",
      decidedAt: serverTimestamp(),
      decidedBy: actorUid,
    });

    // 알림 생성
    transaction.set(notificationRef, {
      userId: appData.appliedByUid,
      type: "TOURNAMENT_REJECTED",
      tournamentId: appData.tournamentId,
      teamId: appData.teamId,
      message: "대회 참가가 거절되었습니다.",
      isRead: false,
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * 대회의 참가 신청 목록 조회
 */
export async function getTournamentApplications(
  tournamentId: string,
  status?: TournamentApplicationStatus
): Promise<TournamentApplication[]> {
  const q = query(
    collection(db, "tournamentApplications"),
    where("tournamentId", "==", tournamentId),
    ...(status ? [where("status", "==", status)] : [])
  );
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TournamentApplication[];
}

/**
 * 대회의 참가 확정 팀 목록 조회
 */
export async function getTournamentTeams(
  tournamentId: string
): Promise<string[]> {
  const q = query(
    collection(db, "tournamentTeams"),
    where("tournamentId", "==", tournamentId)
  );
  const snap = await getDocs(q);

  return snap.docs.map((doc) => {
    const data = doc.data();
    // ID 형식이 {tournamentId}_{teamId}인 경우 추출
    const id = doc.id;
    if (id.includes("_")) {
      return id.split("_")[1]; // teamId 추출
    }
    return data.teamId; // teamId 필드 사용
  });
}
