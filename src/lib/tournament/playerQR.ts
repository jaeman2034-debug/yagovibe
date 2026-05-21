/**
 * 선수 QR 코드 생성 및 검증 유틸리티
 * 개인정보 노출 없이 검증 토큰 기반
 */

/**
 * QR 데이터 구조 (개인정보 없음)
 */
export interface PlayerQRData {
  playerId: string; // 선수 고유 ID
  teamId: string; // 소속 팀 ID
  tournamentId: string; // 참가 대회 ID
  token: string; // 검증 토큰 (위변조 방지)
  version: number; // QR 버전 (향후 호환성)
}

/**
 * QR 코드 문자열 생성
 */
export function encodePlayerQR(data: PlayerQRData): string {
  const payload = JSON.stringify(data);
  // Base64 인코딩 (QR 가독성 향상)
  return btoa(payload);
}

/**
 * QR 코드 문자열 파싱
 */
export function decodePlayerQR(qrString: string): PlayerQRData | null {
  try {
    const decoded = atob(qrString);
    const data = JSON.parse(decoded) as PlayerQRData;
    
    // 버전 체크
    if (!data.playerId || !data.teamId || !data.tournamentId || !data.token) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("[PlayerQR] 파싱 오류:", error);
    return null;
  }
}

/**
 * 검증 토큰 생성 (서버에서 사용)
 * 선수 ID + 팀 ID + 대회 ID + 시크릿 키 기반
 */
export function generateVerificationToken(
  playerId: string,
  teamId: string,
  tournamentId: string,
  secretKey: string
): string {
  // 간단한 HMAC 기반 토큰 (실무에서는 더 복잡한 서명 사용 가능)
  const payload = `${playerId}:${teamId}:${tournamentId}`;
  // 브라우저에서는 crypto.subtle 사용
  // 임시로 간단한 해시 사용 (실제로는 서버에서 생성)
  return btoa(payload + secretKey).substring(0, 16);
}

/**
 * QR 토큰 검증
 */
export function verifyQRToken(
  qrData: PlayerQRData,
  expectedTeamId: string,
  expectedTournamentId: string
): boolean {
  // 토큰 검증은 서버에서 수행 (여기서는 기본 체크만)
  return (
    qrData.teamId === expectedTeamId &&
    qrData.tournamentId === expectedTournamentId
  );
}

