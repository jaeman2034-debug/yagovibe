/**
 * 🔥 심판 역할 Repository 레이어
 * Phase 1-4: 심판 Role Rules
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";

const functions = getFunctions();

/**
 * 심판 역할 설정 (전역 역할)
 */
export async function setRefereeRole(params: {
  uid: string;
  role: "REFEREE" | "ADMIN";
}): Promise<{ ok: true }> {
  const user = auth.currentUser;
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const setRefereeRoleFn = httpsCallable(functions, "setRefereeRole");
  const result = await setRefereeRoleFn(params);
  return result.data as { ok: true };
}

/**
 * 심판 역할 제거
 */
export async function removeRefereeRole(params: {
  uid: string;
}): Promise<{ ok: true }> {
  const user = auth.currentUser;
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const removeRefereeRoleFn = httpsCallable(functions, "removeRefereeRole");
  const result = await removeRefereeRoleFn(params);
  return result.data as { ok: true };
}

/**
 * 현재 사용자의 역할 확인
 */
export async function getMyRole(): Promise<"ADMIN" | "REFEREE" | null> {
  const user = auth.currentUser;
  if (!user) return null;

  // Custom Claims는 getIdTokenResult()로 확인
  // 🔥 개발 환경에서는 getIdTokenResult(true) 사용 안 함 (securetoken API 차단)
  const tokenResult = await user.getIdTokenResult(); // forceRefresh 제거
  const role = tokenResult.claims.role as string | undefined;
  
  if (role === "ADMIN" || role === "REFEREE") {
    return role;
  }
  return null;
}

/**
 * 현재 사용자가 관리자인지 확인
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getMyRole();
  return role === "ADMIN";
}

/**
 * 현재 사용자가 심판인지 확인
 */
export async function isReferee(): Promise<boolean> {
  const role = await getMyRole();
  return role === "REFEREE";
}

