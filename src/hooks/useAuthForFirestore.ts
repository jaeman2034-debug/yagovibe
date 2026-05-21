import { useAuth } from "@/context/AuthProvider";

/**
 * Firestore onSnapshot / getDocs 가드용.
 * - AuthProvider에서 onAuthStateChanged 부트가 끝나기 전(loading)에는 구독하지 않음
 * - 비로그인(user 없음)에도 구독하지 않음 → permission-denied 로그 감소
 */
export function useAuthForFirestore() {
  const { user, loading } = useAuth();
  const canQuery = !loading && !!user?.uid;
  return { user, loading, canQuery };
}
