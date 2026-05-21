/**
 * Identity Toolkit / Secure Token 이 막히면 ID 토큰 발급·갱신이 실패하고 Callable은 `unauthenticated`가 된다.
 * @see GCP에서 Identity Toolkit API·Secure Token API 사용 설정
 * @see Firebase Console → Authentication → 설정 → 승인된 도메인(localhost 등)
 * @see Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → 브라우저용 API 키
 */
export function getFirebaseAuthBlockedHint(fullMessage: string): string | null {
  const t = fullMessage.toLowerCase();
  const blocked =
    t.includes("blocked") ||
    t.includes("are-blocked") ||
    t.includes("has been blocked");

  const toolkitOrToken =
    t.includes("securetoken") ||
    t.includes("granttoken") ||
    t.includes("identitytoolkit") ||
    t.includes("identity toolkit");

  if (toolkitOrToken && blocked) {
    return (
      "Firebase 인증 토큰 API 호출이 차단되었거나 비활성입니다. " +
      "① GCP API 라이브러리에서 Identity Toolkit API·Secure Token API가 「사용」인지 확인하고, " +
      "② Firebase Console → Authentication → 설정 → 승인된 도메인에 localhost · localhost:5173 등을 추가하고, " +
      "③ GCP → 사용자 인증 정보의 브라우저 API 키에서 「API 제한」에 Identity Toolkit을 포함하거나 로컬 테스트 시 제한을 완화하고, " +
      "HTTP 리퍼러 제한이면 http://localhost:5173 이 허용되는지 확인하세요."
    );
  }
  return null;
}
