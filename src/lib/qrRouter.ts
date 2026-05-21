/**
 * 🔥 QR URL 규칙 & 딥링크 스펙 (STEP 2 LOCK)
 * 
 * 핵심 원칙:
 * - QR URL은 반드시 의도 하나만 담는다
 * - "어디로 갈지"만 명확
 * - QR 진입 = 무조건 게스트 허용
 * - QR 로직과 가입 로직 완전 분리
 * - 디바이스별 자동 분기: 모바일 → 지도, PC → 홈
 * - 공개 접근 가능한 URL 기준으로 생성 (localhost 절대 사용 안 함)
 */

import { isMobileLikeDevice } from "@/utils/location"; // 🔥 QR 진입 플로우: 디바이스 분기용
import { getPublicUrl } from "@/utils/getPublicUrl"; // 🔥 QR URL 생성: 공개 접근 가능한 URL 기준으로 생성

/**
 * QR 타입 정의 (초기 LOCK)
 * 
 * 🔥 통합 구조: 모든 QR은 /qr?xxx 형식으로 통일
 * - market=home → 지도/마켓 진입
 * - mode=login&sessionId=xxx → 전화번호 로그인
 * - item=ITEM_ID → 상품 상세
 * - chat=CHAT_ID → 채팅방
 * - seller=USER_ID → 판매자 프로필
 */
export type QRType = "market" | "login" | "item" | "chat" | "seller";

/**
 * QR URL 파라미터 인터페이스
 */
export interface QRParams {
  type: QRType;
  id: string;
  utm?: string; // 추후 분석용 (초기엔 옵션)
}

/**
 * QR URL 표준 포맷: /qr?<type>=<id> 또는 /qr?mode=login&sessionId=xxx
 * 
 * 지원하는 QR 타입:
 * - market=home → 중고 마켓 홈
 * - mode=login&sessionId=xxx → 전화번호 로그인 (🔥 통합 구조)
 * - item=ITEM_ID → 상품 상세
 * - chat=CHAT_ID → 채팅방
 * - seller=USER_ID → 판매자 프로필
 */
export function parseQRUrl(searchParams: URLSearchParams): QRParams | null {
  // 🔥 mode=login&sessionId=xxx (전화번호 로그인 QR 통합)
  // ⚠️ 주의: mode=login은 QRPage에서 직접 처리하므로 여기서는 파싱만 함
  // (실제 리다이렉트는 QRPage에서 처리)
  if (searchParams.has("mode") && searchParams.get("mode") === "login") {
    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      return {
        type: "login",
        id: sessionId,
        utm: searchParams.get("utm") || undefined,
      };
    }
    // sessionId가 없으면 null 반환 (QRPage에서 새 세션 생성)
    return null;
  }

  // 🔥 mode=home (통합 구조: 지도/마켓 진입)
  if (searchParams.has("mode") && searchParams.get("mode") === "home") {
    return {
      type: "market",
      id: "home",
      utm: searchParams.get("utm") || undefined,
    };
  }

  // market=home (기존 호환성 유지)
  if (searchParams.has("market") && searchParams.get("market") === "home") {
    return {
      type: "market",
      id: "home",
      utm: searchParams.get("utm") || undefined,
    };
  }

  // item=ITEM_ID
  if (searchParams.has("item")) {
    const itemId = searchParams.get("item");
    if (itemId) {
      return {
        type: "item",
        id: itemId,
        utm: searchParams.get("utm") || undefined,
      };
    }
  }

  // chat=CHAT_ID
  if (searchParams.has("chat")) {
    const chatId = searchParams.get("chat");
    if (chatId) {
      return {
        type: "chat",
        id: chatId,
        utm: searchParams.get("utm") || undefined,
      };
    }
  }

  // seller=USER_ID
  if (searchParams.has("seller")) {
    const sellerId = searchParams.get("seller");
    if (sellerId) {
      return {
        type: "seller",
        id: sellerId,
        utm: searchParams.get("utm") || undefined,
      };
    }
  }

  return null;
}

/**
 * QR 의도를 목적 경로로 변환
 * 
 * ❗ 여기서 절대 하지 말 것:
 * - 로그인 체크 ❌
 * - 가입 체크 ❌
 * - 권한 체크 ❌
 * 
 * QR 진입 = 무조건 게스트 허용
 * 
 * 🔥 디바이스별 자동 분기:
 * - 모바일: /market/map (마켓 거래 지도)
 * - PC: /home (홈 화면)
 */
export function qrToDestination(qrParams: QRParams): string {
  // 🔥 QR 진입 플로우: 디바이스에 따라 자동 분기
  const isMobile = typeof window !== 'undefined' && isMobileLikeDevice();
  
  switch (qrParams.type) {
    case "login":
      // 🔥 mode=login&sessionId=xxx → 전화번호 로그인 페이지로 리다이렉트
      return `/qr-login?sessionId=${qrParams.id}`;

    case "market":
      // market=home → 디바이스별 분기
      if (qrParams.id === "home") {
        if (isMobile) {
          return "/market/map"; // 마켓 거래 지도 (VoiceMap/범용 지도와 분리)
        } else {
          return "/home"; // 🔥 QR 진입 플로우: PC에서 스캔하면 홈으로
        }
      }
      return "/market"; // 기타 마켓 경로

    case "item":
      return `/item/${qrParams.id}`; // 상품 상세

    case "chat":
      return `/chat/${qrParams.id}`; // 채팅방

    case "seller":
      return `/seller/${qrParams.id}`; // 판매자 프로필

    default:
      // 🔥 QR 진입 플로우: fallback도 디바이스별 분기
      if (isMobile) {
        return "/app/map";
      } else {
        return "/home";
      }
  }
}

/**
 * QR 진입 처리 공통 로직
 * 
 * 책임:
 * 1. QR 의도 해석
 * 2. 게스트 상태 허용 (체크만, 막지 않음)
 * 3. 목적 화면으로 즉시 이동
 * 
 * 사용 예시:
 * ```tsx
 * const qrParams = parseQRUrl(new URLSearchParams(location.search));
 * if (qrParams) {
 *   const destination = qrToDestination(qrParams);
 *   navigate(destination);
 * }
 * ```
 */
export function handleQREntry(searchParams: URLSearchParams): string | null {
  const qrParams = parseQRUrl(searchParams);
  if (!qrParams) {
    return null; // 유효하지 않은 QR
  }

  // 목적 화면 경로 반환 (QR 진입 페이지에서 navigate 호출)
  return qrToDestination(qrParams);
}

/**
 * QR URL 생성 헬퍼 (QR 코드 생성용)
 * 
 * 🔥 공개 접근 가능한 URL 기준으로 생성 (localhost 절대 사용 안 함)
 */
export function generateQRUrl(type: QRType, id: string, utm?: string): string {
  const params = new URLSearchParams();
  
  switch (type) {
    case "login":
      // 🔥 mode=login&sessionId=xxx 형식으로 통일
      params.set("mode", "login");
      params.set("sessionId", id);
      break;
    case "market":
      params.set("market", "home");
      break;
    case "item":
      params.set("item", id);
      break;
    case "chat":
      params.set("chat", id);
      break;
    case "seller":
      params.set("seller", id);
      break;
  }

  if (utm) {
    params.set("utm", utm);
  }

  // 🔥 QR URL 생성: 공개 접근 가능한 URL 기준으로 생성 (getPublicUrl 사용)
  return getPublicUrl(`/qr?${params.toString()}`);
}

