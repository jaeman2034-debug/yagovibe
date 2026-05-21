import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

/**
 * AuthProvider가 loading=false로 내린 뒤에도(iOS·모바일 WebKit)
 * auth.currentUser / onAuthStateChanged가 한 틱 늦게 맞는 경우가 있어
 * PublicRoute·ProtectedRoute에서 /login 으로 오탐 리다이렉트되는 것을 막는다.
 */
export function usePostAuthBootstrapGate(authLoading: boolean): boolean {
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setPending(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await auth.authStateReady();
      } catch {
        /* ignore */
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!cancelled) setPending(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  return authLoading || pending;
}
