/**
 * 🔥 라우팅 헬퍼 함수
 * 
 * 역할:
 * - Canonical Route 생성 통일
 * - 하드코딩 방지
 */

/**
 * 종목 허브 URL 생성
 * @param sport - 종목 slug (soccer, baseball 등)
 * @param tab - 탭 타입
 * @param extra - 추가 쿼리 파라미터
 */
export function sportHubUrl(
  sport: string,
  tab: "activity" | "market" | "team" | "event",
  extra?: Record<string, string>
): string {
  const qs = new URLSearchParams({ tab, ...(extra ?? {}) });
  return `/sports/${sport}?${qs.toString()}`;
}

export { sportMarketDetailUrl } from "@/utils/sportHubHref";
