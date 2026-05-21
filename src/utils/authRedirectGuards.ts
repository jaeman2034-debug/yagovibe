/**
 * Firebase Auth 리다이렉트(구글 등) / 이메일 액션 링크로 돌아온 직후인지.
 * 이 동안 SPA가 navigate로 URL을 바꾸면 OAuth 콜백 파라미터 처리와 엇갈릴 수 있음.
 */
export function isFirebaseAuthCallbackUrl(
  search: string,
  pathname: string,
  hash: string,
  href: string
): boolean {
  const s = search.toLowerCase();
  const h = (hash || "").toLowerCase();
  const full = href.toLowerCase();
  const p = pathname.toLowerCase();

  if (s.includes("apikey") || full.includes("apikey")) return true;
  if (s.includes("oobcode") || full.includes("oobcode")) return true;
  if (s.includes("mode=") || full.includes("mode=")) return true;
  if (p.includes("__/auth") || full.includes("__/auth")) return true;
  if (s.includes("code=") && s.includes("state=")) return true;
  if (h.includes("access_token") || h.includes("id_token")) return true;

  return false;
}
