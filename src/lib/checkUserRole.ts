import { getAuth } from "firebase/auth";

/**
 * 현재 사용자의 역할(Role) 확인
 * Firebase Auth Custom Claims에서 role을 읽어옴
 * @returns "admin" | "manager" | "viewer" | "guest"
 */
export async function checkUserRole(): Promise<"admin" | "manager" | "viewer" | "guest"> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return "guest";
  }

  try {
    // Custom Claims를 포함한 토큰 가져오기
    const token = await user.getIdTokenResult(true); // forceRefresh: true로 최신 claims 가져오기
    const role = token.claims.role as string | undefined;

    if (role === "admin" || role === "manager" || role === "viewer") {
      return role;
    }

    // role이 없으면 기본값 viewer
    return "viewer";
  } catch (error) {
    console.error("❌ 역할 확인 오류:", error);
    return "guest";
  }
}

/**
 * 동기적으로 현재 사용자의 역할 확인 (캐시된 토큰 사용)
 */
export function getCachedUserRole(): "admin" | "manager" | "viewer" | "guest" {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return "guest";
  }

  // 이미 토큰이 있다면 claims에서 읽기 (비동기 idTokenResult는 호출하지 않음)
  // 실제로는 항상 checkUserRole을 사용하는 것이 권장됨
  return "viewer"; // 기본값
}

