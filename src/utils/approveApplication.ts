/**
 * 참가 신청 승인 자동화 함수
 * 
 * 역할:
 * - 신청서 상태를 APPROVED로 업데이트
 * - 팀 자동 생성
 * - 팀장 초대 링크 자동 생성
 * - 신청서에 teamId, inviteId 기록
 * 
 * 플로우:
 * 승인 → 팀 생성 → 초대 링크 생성 → 상태 업데이트
 */

import {
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ApproveApplicationResult {
  teamId: string;
  inviteId: string;
}

export async function approveApplication({
  associationId,
  applicationId,
}: {
  associationId: string;
  applicationId: string;
}): Promise<ApproveApplicationResult> {
  // 1) 신청서 조회
  const appRef = doc(db, "associations", associationId, "Applications", applicationId);
  const appSnap = await getDoc(appRef);
  
  if (!appSnap.exists()) {
    throw new Error("신청서를 찾을 수 없습니다.");
  }

  const application = appSnap.data();
  const teamName = application.teamName;

  if (!teamName) {
    throw new Error("팀명이 없습니다.");
  }

  // 2) 신청서 상태 승인
  await updateDoc(appRef, {
    status: "APPROVED",
    approvedAt: serverTimestamp(),
  });

  // 3) 팀 생성
  const teamsRef = collection(db, "associations", associationId, "Teams");
  const teamDocRef = await addDoc(teamsRef, {
    name: teamName,
    captainUid: null,
    members: [],
    locked: false,
    createdAt: serverTimestamp(),
  });

  const teamId = teamDocRef.id;

  // 4) 팀장 초대 링크 생성
  const invitesRef = collection(db, "associations", associationId, "TeamInvites");
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24)); // 24시간

  const inviteDocRef = await addDoc(invitesRef, {
    teamId: teamId,
    associationId: associationId,
    role: "captain",
    used: false,
    revoked: false,
    expiresAt: expiresAt,
    createdAt: serverTimestamp(),
  });

  const inviteId = inviteDocRef.id;

  // 5) 신청서에 teamId, inviteId 기록
  await updateDoc(appRef, {
    teamId: teamId,
    inviteId: inviteId,
  });

  return {
    teamId: teamId,
    inviteId: inviteId,
  };
}

