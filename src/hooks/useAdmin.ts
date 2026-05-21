import { useRoleGate } from "@/hooks/useRoleGate";

/**
 * 플랫폼 관리자 여부 — {@link useRoleGate} / {@link checkUserRole} / `platformRole` 과 동일 기준.
 * (구 `token.admin` + `users.role` 이중 구현 제거)
 *
 * 같은 컴포넌트에서 `useRoleGate`와 함께 쓰지 말 것(이중 구독). 포털 화면은 `useRoleGate`만 쓰고
 * `isPlatformAdmin`을 사용하면 된다.
 */
export function useAdmin() {
  const { isPlatformAdmin, loading } = useRoleGate();
  return { isAdmin: isPlatformAdmin, loading };
}
