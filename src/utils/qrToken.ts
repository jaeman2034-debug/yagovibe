/**
 * 🔥 위치 기반 QR 토큰 생성 및 검증 유틸
 * 
 * 목표:
 * - 특정 위치(lat, lng) 포함
 * - 만료 시간 설정 가능
 * - 위조 방지 (나중에 JWT로 업그레이드 가능)
 * 
 * 현재: Base64 인코딩 (클라이언트)
 * 향후: JWT 기반 (Firebase Functions)
 */

export interface LocationQRPayload {
  type: 'LOCATION_QR';
  path: string;
  lat: number;
  lng: number;
  exp?: number; // 만료 시간 (Unix timestamp, 초)
  data?: Record<string, any>; // 추가 데이터
}

/**
 * 위치 기반 QR 토큰 생성
 * 
 * @param lat - 위도
 * @param lng - 경도
 * @param expiresInMinutes - 만료 시간 (분, 기본값: 10분)
 * @param path - 목적 경로 (기본값: '/app/map')
 * @param data - 추가 데이터
 * @returns Base64 인코딩된 토큰
 */
export function createLocationQrToken({
  lat,
  lng,
  expiresInMinutes = 10,
  path = '/app/map',
  data,
}: {
  lat: number;
  lng: number;
  expiresInMinutes?: number;
  path?: string;
  data?: Record<string, any>;
}): string {
  const payload: LocationQRPayload = {
    type: 'LOCATION_QR',
    path,
    lat,
    lng,
    exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60), // 현재 시간 + 만료 시간
    ...(data && { data }),
  };

  // Base64 인코딩 (향후 JWT로 업그레이드 가능)
  const token = btoa(JSON.stringify(payload));
  return token;
}

/**
 * QR 토큰 검증 및 파싱
 * 
 * @param token - Base64 인코딩된 토큰
 * @returns 파싱된 페이로드 또는 null (만료/위조)
 */
export function verifyLocationQrToken(token: string): LocationQRPayload | null {
  try {
    // Base64 디코딩
    const decoded = JSON.parse(atob(token)) as LocationQRPayload;

    // 타입 검증
    if (decoded.type !== 'LOCATION_QR') {
      console.warn('[verifyLocationQrToken] Invalid QR type:', decoded.type);
      return null;
    }

    // 만료 시간 검증
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      console.warn('[verifyLocationQrToken] QR token expired');
      return null;
    }

    // 좌표 유효성 검증
    if (
      typeof decoded.lat !== 'number' ||
      typeof decoded.lng !== 'number' ||
      !Number.isFinite(decoded.lat) ||
      !Number.isFinite(decoded.lng) ||
      decoded.lat < -90 || decoded.lat > 90 ||
      decoded.lng < -180 || decoded.lng > 180
    ) {
      console.warn('[verifyLocationQrToken] Invalid coordinates:', { lat: decoded.lat, lng: decoded.lng });
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('[verifyLocationQrToken] Token decode error:', error);
    return null;
  }
}
