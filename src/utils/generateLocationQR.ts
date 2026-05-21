/**
 * 🔥 위치 기반 QR 생성 헬퍼
 * 
 * 역할:
 * - 현재 위치 또는 지정 위치를 기반으로 QR 토큰 생성
 * - QR URL 생성
 * - QR 이미지 URL 생성
 * 
 * 사용 예시:
 * ```ts
 * const { qrUrl, qrImageUrl } = generateLocationQR({
 *   lat: 37.5665,
 *   lng: 126.9780,
 *   expiresInMinutes: 10,
 * });
 * ```
 */

import { createLocationQrToken } from "./qrToken";
import { getPublicUrl } from "./getPublicUrl";

export interface GenerateLocationQROptions {
  lat: number;
  lng: number;
  expiresInMinutes?: number;
  path?: string;
  data?: Record<string, any>;
}

export interface LocationQRResult {
  token: string;
  qrUrl: string;
  qrImageUrl: string;
}

/**
 * 위치 기반 QR 생성
 * 
 * @param options - 위치 및 옵션
 * @returns QR 토큰, URL, 이미지 URL
 */
export function generateLocationQR(options: GenerateLocationQROptions): LocationQRResult {
  const {
    lat,
    lng,
    expiresInMinutes = 10,
    path = '/app/map',
    data,
  } = options;

  // 토큰 생성
  const token = createLocationQrToken({
    lat,
    lng,
    expiresInMinutes,
    path,
    data,
  });

  // QR URL 생성
  const qrUrl = getPublicUrl(`/q/${token}`);

  // QR 이미지 URL 생성 (고해상도)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`;

  return {
    token,
    qrUrl,
    qrImageUrl,
  };
}
