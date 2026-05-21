/**
 * 🔥 팀 가입 요청 관리 (STEP: 팀원 가입 플로우)
 * 
 * 컬렉션: teamJoinRequests/{requestId}
 * 문서 ID: teamId__userId (신규 신청). 레거시 랜덤 ID 문서는 승인 UI에서 그대로 사용 가능.
 *
 * 구조:
 * {
 *   teamId: string;
 *   userId: string;
 *   status: 'pending' | 'approved' | 'rejected';
 *   joinAs?: 'player' | 'parent';
 *   userName?: string;
 *   userEmail?: string;
 *   contactPhone?: string; // 신청자가 선택 입력 (팀 스태프만 목록 조회 가능)
 *   createdAt: Timestamp;
 *   updatedAt: Timestamp;
 * }
 *
 * 승인·거절: Cloud Functions approveTeamJoinRequest / rejectTeamJoinRequest (Admin SDK)
 */

import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  runTransaction,
  deleteDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";

/** 랜딩 `/join` — 스태프가 승인 시 의도 구분용(문서만 저장, 승인 시 role은 기존 로직 유지) */
export type TeamJoinAs = "player" | "parent";

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  joinAs?: TeamJoinAs;
  message?: string;
  userName?: string;
  userEmail?: string;
  /** 가입 요청 시 선택 입력 — 팀 관리(가입 요청 탭)에서만 조회 */
  contactPhone?: string;
  createdAt: any;
  updatedAt: any;
}

/** 가입 요청 문서에 넣을 신청자 표시 정보 (Auth 프로필 기반) */
export function applicantProfileFromAuthUser(user: {
  displayName?: string | null;
  email?: string | null;
}): { userName?: string; userEmail?: string } {
  const email = user.email?.trim();
  const display = user.displayName?.trim();
  const userName = display || (email ? email.split("@")[0] : undefined);
  const out: { userName?: string; userEmail?: string } = {};
  if (userName) out.userName = userName.slice(0, 200);
  if (email) out.userEmail = email.slice(0, 320);
  return out;
}

/** 문서 ID — Rules의 `teamId + "__" + userId`와 동일해야 함 */
export function teamJoinRequestDocId(teamId: string, userId: string): string {
  return `${teamId}__${userId}`;
}

type UserLikeDoc = Record<string, unknown>;

function pickNameEmailFromUserLikeDoc(d: UserLikeDoc | undefined): {
  display: string;
  email: string;
} {
  if (!d) return { display: "", email: "" };
  const email =
    (typeof d.email === "string" && d.email.trim()) ||
    (typeof d.userEmail === "string" && d.userEmail.trim()) ||
    "";
  const display =
    (typeof d.displayName === "string" && d.displayName.trim()) ||
    (typeof d.nickname === "string" && d.nickname.trim()) ||
    (typeof d.name === "string" && d.name.trim()) ||
    "";
  return { display, email };
}

/**
 * Auth/클라이언트에서 넘긴 값이 비어 있을 때 `users`·`userProfiles`로 표시명·이메일 보강
 * (승인 시 team_members / teams/.../members 에 복사되도록 teamJoinRequests에 저장)
 */
export async function resolveApplicantFieldsForJoinRequest(
  userId: string,
  partial?: { userName?: string | null; userEmail?: string | null }
): Promise<{ userName?: string; userEmail?: string }> {
  let userName = (partial?.userName && String(partial.userName).trim()) || "";
  let userEmail = (partial?.userEmail && String(partial.userEmail).trim()) || "";

  const mergeFromDoc = (d: UserLikeDoc | undefined) => {
    const { display, email } = pickNameEmailFromUserLikeDoc(d);
    if (!userName) {
      userName = (display || (email ? email.split("@")[0]! : "") || "").slice(0, 200);
    }
    if (!userEmail && email) {
      userEmail = email.slice(0, 320);
    }
  };

  if (!userName || !userEmail) {
    try {
      const uSnap = await getDoc(doc(db, "users", userId));
      if (uSnap.exists()) mergeFromDoc(uSnap.data() as UserLikeDoc);
    } catch {
      /* Rules 등으로 읽기 실패 시 무시 */
    }
  }
  if (!userName || !userEmail) {
    try {
      const pSnap = await getDoc(doc(db, "userProfiles", userId));
      if (pSnap.exists()) mergeFromDoc(pSnap.data() as UserLikeDoc);
    } catch {
      /* 컬렉션 없거나 권한 없으면 무시 */
    }
  }

  const out: { userName?: string; userEmail?: string } = {};
  if (userName) out.userName = userName;
  if (userEmail) out.userEmail = userEmail;
  return out;
}

/**
 * 팀 가입 요청 생성
 */
export async function createTeamJoinRequest(
  teamId: string,
  userId: string,
  options?: {
    joinAs?: TeamJoinAs;
    message?: string;
    userName?: string | null;
    userEmail?: string | null;
    /** 숫자·+·-·공백·괄호만, 최대 32자 (선택) */
    contactPhone?: string | null;
  }
): Promise<string> {
  const enriched = await resolveApplicantFieldsForJoinRequest(userId, {
    userName: options?.userName ?? undefined,
    userEmail: options?.userEmail ?? undefined,
  });

  const requestId = teamJoinRequestDocId(teamId, userId);
  const requestRef = doc(db, "teamJoinRequests", requestId);
  const existingSnap = await getDoc(requestRef);

  if (existingSnap.exists()) {
    const st = existingSnap.get("status") as string | undefined;
    if (st === "pending") {
      throw new Error("이미 가입 요청이 진행 중입니다.");
    }
    if (st === "approved") {
      throw new Error("이미 승인된 가입 요청이 있습니다. 내 팀 목록을 확인해 주세요.");
    }
    if (st === "rejected") {
      await deleteDoc(requestRef);
    }
  }

  const payload: Record<string, unknown> = {
    teamId,
    userId,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (options?.joinAs) {
    payload.joinAs = options.joinAs;
  }
  if (options?.message?.trim()) {
    payload.message = options.message.trim().slice(0, 500);
  }
  const uname = enriched.userName?.trim();
  if (uname) {
    payload.userName = uname.slice(0, 200);
  }
  const uemail = enriched.userEmail?.trim();
  if (uemail) {
    payload.userEmail = uemail.slice(0, 320);
  }
  const phone = options?.contactPhone?.trim();
  if (phone) {
    payload.contactPhone = phone.slice(0, 32);
  }

  await setDoc(requestRef, payload);
  return requestId;
}

/**
 * 🔥 팀 가입 요청 승인 (트랜잭션으로 원자적 처리)
 * 
 * 트랜잭션 내부 작업:
 * 1. 요청 상태 확인 및 업데이트
 * 2. teams/{teamId}/members/{userId} 생성
 * 3. team_members 역인덱스 생성
 * 4. notifications 알림 생성
 * 
 * 실패 시 전부 롤백
 * 
 * @param requestId - teamJoinRequests 문서 ID
 * @param teamId - 팀 ID
 * @param userId - 요청한 사용자 UID
 * @param actorId - 승인하는 팀장 UID (감사 로그용)
 * @param teamName - 팀 이름 (알림 메시지용)
 */
export async function approveTeamJoinRequest(
  requestId: string,
  teamId: string,
  userId: string,
  actorId: string,
  teamName?: string
): Promise<void> {
  void teamName;
  if (!requestId || !teamId || !userId || !actorId) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const requestRef = doc(db, "teamJoinRequests", requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error("REQUEST_NOT_FOUND: 가입 요청을 찾을 수 없습니다.");
  }
  const d = requestSnap.data();
  if (d.teamId !== teamId || d.userId !== userId) {
    throw new Error("요청 정보가 일치하지 않습니다.");
  }

  const approveFn = httpsCallable<{ requestId: string }, { ok: boolean }>(
    functions,
    "approveTeamJoinRequest"
  );
  try {
    await approveFn({ requestId });
  } catch (e) {
    throw new Error(callableErrorMessage(e));
  }
}

/**
 * 🔥 팀 가입 요청 거절 (트랜잭션으로 원자적 처리)
 * 
 * 트랜잭션 내부 작업:
 * 1. 요청 상태 확인 및 업데이트 (pending → rejected)
 * 2. notifications 알림 생성
 * 
 * 멤버 추가 없음 (승인과 달리)
 * 
 * @param requestId - teamJoinRequests 문서 ID
 * @param userId - 요청한 사용자 UID (알림용)
 * @param teamName - 팀 이름 (알림 메시지용)
 * @param actorId - 거절하는 팀장 UID (감사 로그용)
 * @param reason - 거절 사유 (선택)
 */
export async function rejectTeamJoinRequest(
  requestId: string,
  userId: string,
  teamName: string,
  actorId: string,
  reason?: string
): Promise<void> {
  if (!requestId || !userId || !teamName || !actorId) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const requestRef = doc(db, "teamJoinRequests", requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error("REQUEST_NOT_FOUND: 가입 요청을 찾을 수 없습니다.");
  }
  const d = requestSnap.data();
  if (d.userId !== userId) {
    throw new Error("요청 정보가 일치하지 않습니다.");
  }

  const rejectFn = httpsCallable<
    { requestId: string; teamName: string; reason?: string | null },
    { ok: boolean }
  >(functions, "rejectTeamJoinRequest");
  try {
    await rejectFn({ requestId, teamName, reason: reason ?? null });
  } catch (e) {
    throw new Error(callableErrorMessage(e));
  }
}

/**
 * 사용자의 팀 가입 요청 조회
 */
export async function getUserTeamJoinRequests(
  userId: string
): Promise<TeamJoinRequest[]> {
  const q = query(
    collection(db, "teamJoinRequests"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TeamJoinRequest[];
}

/**
 * 팀의 가입 요청 조회 (팀장용)
 */
export async function getTeamJoinRequests(
  teamId: string
): Promise<TeamJoinRequest[]> {
  const q = query(
    collection(db, "teamJoinRequests"),
    where("teamId", "==", teamId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TeamJoinRequest[];
}

/**
 * 🔥 팀 가입 요청 취소 (사용자가 직접 취소)
 * 
 * pending 상태의 요청만 취소 가능
 * 
 * @param requestId - teamJoinRequests 문서 ID
 * @param userId - 요청한 사용자 UID (본인 확인용)
 */
export async function cancelTeamJoinRequest(
  requestId: string,
  userId: string
): Promise<void> {
  if (!requestId || !userId) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const requestRef = doc(db, "teamJoinRequests", requestId);

  // 🔥 트랜잭션으로 안전하게 취소
  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error("REQUEST_NOT_FOUND: 가입 요청을 찾을 수 없습니다.");
    }

    const requestData = requestSnap.data();
    
    // 본인 확인
    if (requestData.userId !== userId) {
      throw new Error("UNAUTHORIZED: 본인의 요청만 취소할 수 있습니다.");
    }

    // pending 상태만 취소 가능
    if (requestData.status !== "pending") {
      throw new Error("이미 처리된 요청은 취소할 수 없습니다.");
    }

    // 요청 삭제 (취소된 요청은 기록 불필요)
    transaction.delete(requestRef);
  });
}
