/// <reference types="vite/client" />

interface Window {
  /** DEV: `auth.currentUser.uid` — 콘솔에서 `window.__AUTH_UID` */
  __AUTH_UID?: string;
  __YAGO_AUTH_UID?: string;
  /** DEV: `yagoAuthUid()` — 로그인 직후 최신 uid */
  yagoAuthUid?: () => string | null;
}
