/**
 * Google 웹 로그인은 `@/utils/authHelpers`의 `signInWithGoogleAdaptive` → 기본 `signInWithPopup`
 * (VITE_GOOGLE_REDIRECT_ON_MOBILE=1 일 때만 모바일 redirect).
 */
export function shouldUseRedirect(): boolean {
  return false;
}
