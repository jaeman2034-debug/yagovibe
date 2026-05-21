/**
 * 🔥 Partner Security - 파트너 보안
 * 
 * HMAC 서명, IP 화이트리스트, 토큰 만료
 */

import type { PartnerRequest, PartnerConfig } from "./partner.types";

/**
 * HMAC 서명 생성 (브라우저 호환)
 * 
 * 실제 프로덕션에서는 서버 측에서 생성하는 것을 권장합니다.
 */
export async function generateHMACSignature(
  payload: Record<string, any>,
  secret: string,
  timestamp: string
): Promise<string> {
  const message = `${timestamp}:${JSON.stringify(payload)}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Web Crypto API 사용
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * HMAC 서명 검증 (비동기)
 * 
 * 실제 프로덕션에서는 서버 측에서 검증하는 것을 권장합니다.
 */
export async function verifyHMACSignature(
  request: PartnerRequest,
  secret: string,
  toleranceSeconds: number = 300 // 5분
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  // 타임스탬프 검증
  const requestTime = new Date(request.timestamp).getTime();
  const now = Date.now();
  const timeDiff = Math.abs(now - requestTime) / 1000;

  if (timeDiff > toleranceSeconds) {
    return {
      valid: false,
      reason: `타임스탬프 만료: ${timeDiff}초 경과`,
    };
  }

  // 서명 검증
  const expectedSignature = await generateHMACSignature(
    request.payload,
    secret,
    request.timestamp
  );

  if (request.signature !== expectedSignature) {
    return {
      valid: false,
      reason: "서명 불일치",
    };
  }

  return { valid: true };
}

/**
 * IP 화이트리스트 검증
 */
export function verifyIPWhitelist(
  clientIP: string,
  allowedIPs?: string[]
): {
  allowed: boolean;
  reason?: string;
} {
  if (!allowedIPs || allowedIPs.length === 0) {
    return { allowed: true }; // 화이트리스트 없으면 허용
  }

  // CIDR 지원 (간단 버전)
  for (const allowedIP of allowedIPs) {
    if (allowedIP.includes("/")) {
      // CIDR 처리 (실제 구현 시 ipaddr.js 등 사용)
      if (clientIP.startsWith(allowedIP.split("/")[0])) {
        return { allowed: true };
      }
    } else {
      if (clientIP === allowedIP) {
        return { allowed: true };
      }
    }
  }

  return {
    allowed: false,
    reason: `IP ${clientIP}가 화이트리스트에 없음`,
  };
}

/**
 * 토큰 만료 검증
 */
export function verifyTokenExpiry(
  issuedAt: string,
  expirySeconds?: number
): {
  valid: boolean;
  reason?: string;
} {
  if (!expirySeconds) {
    return { valid: true }; // 만료 시간 없으면 항상 유효
  }

  const issued = new Date(issuedAt).getTime();
  const now = Date.now();
  const age = (now - issued) / 1000;

  if (age > expirySeconds) {
    return {
      valid: false,
      reason: `토큰 만료: ${age}초 경과 (만료: ${expirySeconds}초)`,
    };
  }

  return { valid: true };
}

/**
 * 파트너 요청 종합 검증 (비동기)
 * 
 * 실제 프로덕션에서는 서버 측에서 검증하는 것을 권장합니다.
 */
export async function validatePartnerRequest(
  request: PartnerRequest,
  config: PartnerConfig,
  clientIP: string
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  // 1. HMAC 서명 검증
  const signatureCheck = await verifyHMACSignature(request, config.apiSecret);
  if (!signatureCheck.valid) {
    return signatureCheck;
  }

  // 2. IP 화이트리스트 검증
  const ipCheck = verifyIPWhitelist(clientIP, config.allowedIPs);
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  // 3. 토큰 만료 검증 (요청 타임스탬프 기준)
  const tokenCheck = verifyTokenExpiry(
    request.timestamp,
    config.tokenExpiry
  );
  if (!tokenCheck.valid) {
    return tokenCheck;
  }

  return { valid: true };
}
