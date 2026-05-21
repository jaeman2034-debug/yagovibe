import { onAuthStateChanged, type Auth } from "firebase/auth";

let attached = false;

/**
 * DEV: 콘솔에서 `window.__AUTH_UID` / `window.__YAGO_AUTH_UID` 로 즉시 확인.
 * (같은 브라우저 프로필 두 창이면 양쪽 값이 같아질 수 있음)
 */
export function attachDevAuthDebug(auth: Auth): void {
  if (!import.meta.env.DEV || attached || typeof window === "undefined") return;
  attached = true;

  onAuthStateChanged(auth, (user) => {
    const uid = user?.uid?.trim() || null;
    window.__AUTH_UID = uid ?? undefined;
    window.__YAGO_AUTH_UID = uid ?? undefined;
    console.log("AUTH UID", uid ?? "(signed out)");
  });

  /** 콘솔: `yagoAuthUid()` — modular Firebase (compat `firebase.auth()` 아님) */
  window.yagoAuthUid = () => auth.currentUser?.uid ?? null;
}
