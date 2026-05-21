/**
 * 🔥 팀 초대 링크 관리
 *
 * 구조(실제): `inviteLinks/{inviteId}` 루트 컬렉션 — inviteId만으로 랜딩 조회
 *
 * 역할:
 * - 초대 링크 생성 (팀 owner/admin 또는 팀 문서상 팀장)
 * - 초대 링크로 가입 요청 생성
 * - 기존 승인 플로우와 100% 호환
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  runTransaction,
  collectionGroup,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createTeamJoinRequest, type TeamJoinAs } from "./teamJoinRequest";

export interface TeamInviteLink {
  id: string;
  teamId: string;
  role: "member"; // 🔥 소문자로 통일 (MEMBER → member)
  expiresAt: any | null;
  maxUses: number | null;
  usedCount: number;
  createdBy: string;
  isActive: boolean;
  createdAt: any;
  /** 초대 랜딩에서 teams 문서 없이 표시 (비멤버도 inviteLinks만 읽으면 됨) */
  teamName?: string;
  teamRegion?: string;
  teamDescription?: string;
  /** 랜딩용 활동 시간·요일 등 한 줄 (비로그인도 표시) */
  teamActivityNote?: string;
}

/**
 * 초대 링크 생성
 * 
 * 구조: inviteLinks/{inviteId} (루트 컬렉션)
 * 이유: inviteId만으로 조회 가능하도록
 */
export async function createTeamInviteLink(
  teamId: string,
  leaderUid: string,
  options?: {
    expiresAt?: Date | null;
    maxUses?: number | null;
    /** 팀 문서를 읽지 않고 초대 페이지에 표시 */
    teamName?: string | null;
    teamRegion?: string | null;
    teamDescription?: string | null;
    teamActivityNote?: string | null;
  }
): Promise<string> {
  const inviteRef = doc(collection(db, "inviteLinks"));

  const rawName = options?.teamName?.trim();
  const payload: Record<string, unknown> = {
    teamId,
    role: "member", // 🔥 소문자로 통일 (MEMBER → member)
    expiresAt: options?.expiresAt || null,
    maxUses: options?.maxUses || null,
    usedCount: 0,
    createdBy: leaderUid,
    isActive: true,
    createdAt: serverTimestamp(),
  };
  if (rawName) {
    payload.teamName = rawName.slice(0, 200);
  }
  const rawRegion = options?.teamRegion?.trim();
  if (rawRegion) {
    payload.teamRegion = rawRegion.slice(0, 200);
  }
  const rawDesc = options?.teamDescription?.trim();
  if (rawDesc) {
    payload.teamDescription = rawDesc.slice(0, 2000);
  }
  const rawAct = options?.teamActivityNote?.trim();
  if (rawAct) {
    payload.teamActivityNote = rawAct.slice(0, 500);
  }

  await setDoc(inviteRef, payload);

  return inviteRef.id;
}

/**
 * 초대 링크 조회 및 유효성 검사 (teamId 필요)
 * 
 * @deprecated getInviteLinkById 사용 권장 (inviteId만으로 조회 가능)
 */
export async function getTeamInviteLink(
  teamId: string,
  inviteId: string
): Promise<TeamInviteLink | null> {
  const inviteRef = doc(db, "inviteLinks", inviteId);
  const snap = await getDoc(inviteRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  
  // teamId 일치 확인
  if (data.teamId !== teamId) {
    return null;
  }

  return {
    id: snap.id,
    ...data,
  } as TeamInviteLink;
}

/**
 * inviteId로 초대 링크 조회
 * 
 * 구조: inviteLinks/{inviteId} (루트 컬렉션)
 */
export async function getInviteLinkById(
  inviteId: string
): Promise<{ invite: TeamInviteLink; teamId: string } | null> {
  const inviteRef = doc(db, "inviteLinks", inviteId);
  const snap = await getDoc(inviteRef);
  
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  const teamId = data.teamId;

  if (!teamId) {
    return null;
  }

  return {
    invite: {
      id: snap.id,
      teamId,
      ...data,
    } as TeamInviteLink,
    teamId,
  };
}

/**
 * 초대 링크 유효성 검사
 */
export function validateInviteLink(invite: TeamInviteLink): {
  valid: boolean;
  error?: string;
} {
  // 1. 활성 상태 확인
  if (!invite.isActive) {
    return { valid: false, error: "초대 링크가 비활성화되었습니다." };
  }

  // 2. 만료 시간 확인
  if (invite.expiresAt) {
    const expiresAt = invite.expiresAt instanceof Timestamp
      ? invite.expiresAt.toDate()
      : invite.expiresAt instanceof Date
      ? invite.expiresAt
      : new Date(invite.expiresAt);
    
    if (expiresAt < new Date()) {
      return { valid: false, error: "초대 링크가 만료되었습니다." };
    }
  }

  // 3. 사용 횟수 확인
  if (invite.maxUses != null && invite.usedCount >= invite.maxUses) {
    return { valid: false, error: "초대 링크 사용 횟수를 초과했습니다." };
  }

  return { valid: true };
}

/**
 * 초대 링크로 가입 요청 생성
 */
export async function joinTeamViaInviteLink(
  inviteId: string,
  userId: string,
  applicant?: {
    userName?: string | null;
    userEmail?: string | null;
    message?: string | null;
    joinAs?: TeamJoinAs;
    contactPhone?: string | null;
  }
): Promise<string> {
  // 1️⃣ 초대 링크 조회
  const result = await getInviteLinkById(inviteId);
  
  if (!result) {
    throw new Error("초대 링크를 찾을 수 없습니다.");
  }

  const { invite, teamId } = result;

  // 2️⃣ 유효성 검사
  const validation = validateInviteLink(invite);
  if (!validation.valid) {
    throw new Error(validation.error || "초대 링크가 유효하지 않습니다.");
  }

  // 3️⃣ teamJoinRequests 생성 (기존 플로우 재사용)
  const requestId = await createTeamJoinRequest(teamId, userId, {
    userName: applicant?.userName ?? undefined,
    userEmail: applicant?.userEmail ?? undefined,
    message: applicant?.message ?? undefined,
    joinAs: applicant?.joinAs,
    contactPhone: applicant?.contactPhone ?? undefined,
  });

  // 4️⃣ 사용 카운트 증가
  await incrementInviteLinkUsage(inviteId);

  return requestId;
}

/**
 * 초대 링크 사용 카운트 증가
 */
export async function incrementInviteLinkUsage(
  inviteId: string
): Promise<void> {
  const inviteRef = doc(db, "inviteLinks", inviteId);
  /** increment()는 Rules에서 기대값과 어긋나 permission-denied가 나는 경우가 있어, 숫자 +1로 명시 */
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(inviteRef);
    if (!snap.exists()) return;
    const cur = snap.data().usedCount;
    const n = typeof cur === "number" && !Number.isNaN(cur) ? cur : 0;
    transaction.update(inviteRef, { usedCount: n + 1 });
  });
}
