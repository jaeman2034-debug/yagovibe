/**
 * 긴급 비활성화: 기존 App 내 휴리스틱이 모바일 Chrome을 인앱으로 오탐 → /in-app·OAuth 끊김 유발.
 * 나중에 다시 켤 때는 UA만 사용할 것:
 * `const isInApp = /KAKAOTALK|Instagram|FBAN|FBAV/i.test(navigator.userAgent);`
 * — `navigator.userAgent.includes("Mobile")` / `includes("Android")` 같은 패턴은 금지.
 */
export default function InAppBrowserRedirect() {
  return null; // 🔥 완전 비활성화
}
