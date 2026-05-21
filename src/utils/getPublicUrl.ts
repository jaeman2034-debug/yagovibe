/**
 * 🔥 공개 URL 생성 유틸 (QR 코드, 공유 링크 등 외부 접근용)
 * 
 * 핵심 원칙:
 * - QR은 절대 localhost를 직접 가리키면 안 됨
 * - 항상 "외부에서 접근 가능한 URL" 기준으로 생성
 * - window.location.origin에 의존하지 않음
 * 
 * 사용 예시:
 * ```ts
 * const qrUrl = getPublicUrl('/qr?market=home');
 * const shareUrl = getPublicUrl('/app/map');
 * ```
 */

/**
 * 공개 접근 가능한 URL 생성
 * 
 * @param path - 경로 (예: '/home', '/app/map', '/qr?market=home')
 * @returns 완전한 공개 URL
 */
export function getPublicUrl(path: string = ''): string {
  // 1순위: 환경 변수로 명시적 설정 (VITE_PUBLIC_BASE_URL)
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL;
  
  if (baseUrl) {
    // baseUrl이 이미 슬래시로 끝나면 제거
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // path가 슬래시로 시작하면 그대로, 아니면 추가
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }
  
  // 2순위: 프로덕션 환경에서는 window.location.origin 사용 (실제 도메인)
  if (import.meta.env.MODE === 'production') {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${cleanPath}`;
  }
  
  // 3순위: 개발 환경에서는 localhost 경고와 함께 현재 origin 사용
  // ⚠️ 개발 환경에서 모바일 테스트 시 ngrok 등 터널링 서비스 사용 권장
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn(
        '⚠️ [getPublicUrl] 개발 환경에서 localhost URL이 생성되었습니다.\n' +
        '모바일에서 테스트하려면 다음 중 하나를 사용하세요:\n' +
        '1. ngrok: npx ngrok http 5173\n' +
        '2. 환경 변수: VITE_PUBLIC_BASE_URL=https://your-ngrok-url.ngrok.io\n' +
        '3. 같은 Wi-Fi에서 내부 IP 사용: VITE_PUBLIC_BASE_URL=http://192.168.x.x:5173'
      );
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${cleanPath}`;
  }
  
  // Fallback: SSR 환경 등
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanPath;
}
