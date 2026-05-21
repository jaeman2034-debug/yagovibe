/**
 * 🔥 Deep Link Router - 딥링크 엔진
 * 
 * 외부 → 앱 복귀, 지역/팀 컨텍스트 유지
 */

import type { DeepLinkParams, DeepLinkType, Region } from "../domain/superapp.types";
import { isValidRegion } from "../domain/region.types";

/**
 * 딥링크 스킴
 */
export const DEEPLINK_SCHEME = "hub://";

/**
 * 딥링크 URL 파싱
 */
export function parseDeepLink(url: string): DeepLinkParams | null {
  try {
    // hub://r/seoul/ground/123?from=share
    if (!url.startsWith(DEEPLINK_SCHEME)) {
      // HTTP 링크도 지원: https://hub.com/r/seoul/ground/123
      if (url.includes("/r/")) {
        return parseHttpLink(url);
      }
      return null;
    }

    const path = url.replace(DEEPLINK_SCHEME, "");
    const parts = path.split("/");

    if (parts.length < 4 || parts[0] !== "r") {
      return null;
    }

    const region = parts[1];
    if (!isValidRegion(region)) {
      return null;
    }

    const type = parts[2] as DeepLinkType;
    const id = parts[3];

    // 쿼리 파라미터 파싱
    const query: Record<string, string> = {};
    if (parts[4]) {
      const queryString = parts.slice(4).join("/");
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        query[key] = value;
      });
    }

    return {
      type,
      region: region as Region,
      id,
      query: Object.keys(query).length > 0 ? query : undefined,
    };
  } catch (error) {
    console.warn("[DeepLink] 파싱 실패:", error);
    return null;
  }
}

/**
 * HTTP 링크 파싱
 */
function parseHttpLink(url: string): DeepLinkParams | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length < 3 || pathParts[0] !== "r") {
      return null;
    }

    const region = pathParts[1];
    if (!isValidRegion(region)) {
      return null;
    }

    const type = pathParts[2] as DeepLinkType;
    const id = pathParts[3] || "";

    // 쿼리 파라미터
    const query: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    return {
      type,
      region: region as Region,
      id,
      query: Object.keys(query).length > 0 ? query : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 딥링크 → 라우트 변환
 */
export function deepLinkToRoute(params: DeepLinkParams): string {
  const base = `/r/${params.region}`;

  switch (params.type) {
    case "ground":
      return `${base}/ground/${params.id}`;
    case "team":
      return `${base}/team/${params.id}`;
    case "league":
      return `${base}/league/${params.id}`;
    case "match":
      return `${base}/match/${params.id}`;
    case "story":
      return `${base}/story/${params.id}`;
    case "hub":
      return `${base}`;
    default:
      return base;
  }
}

/**
 * 딥링크 라우터 (통합)
 */
export function routeDeepLink(
  url: string,
  navigate: (path: string) => void
): boolean {
  const params = parseDeepLink(url);
  if (!params) {
    return false;
  }

  const route = deepLinkToRoute(params);
  navigate(route);

  // 쿼리 파라미터 처리 (예: from=share)
  if (params.query) {
    // navigate 함수가 쿼리를 지원하는 경우
    // navigate(route, { state: params.query });
  }

  return true;
}

/**
 * 딥링크 생성
 */
export function createDeepLink(params: DeepLinkParams): string {
  const base = `${DEEPLINK_SCHEME}r/${params.region}/${params.type}/${params.id}`;
  
  if (params.query && Object.keys(params.query).length > 0) {
    const queryString = new URLSearchParams(params.query).toString();
    return `${base}?${queryString}`;
  }
  
  return base;
}
