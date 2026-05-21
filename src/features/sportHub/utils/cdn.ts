/**
 * 🔥 CDN Utilities - 이미지 CDN 규칙
 */

/**
 * CDN URL 생성
 * 
 * @param path - 이미지 경로
 * @param options - CDN 옵션
 * @returns CDN URL
 */
export function getCdnUrl(
  path: string,
  options?: {
    width?: number;
    quality?: number;
    format?: "webp" | "jpg" | "png";
  }
): string {
  const { width = 800, quality = 70, format = "webp" } = options || {};

  // CDN 베이스 URL (환경변수 또는 기본값)
  const CDN_BASE = import.meta.env.VITE_CDN_BASE || "https://cdn.your.com";

  // 이미 전체 URL이면 그대로 반환
  if (path.startsWith("http")) {
    return path;
  }

  // 상대 경로인 경우 CDN 베이스 추가
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const fullPath = `${CDN_BASE}/${cleanPath}`;

  // URL 파라미터 추가
  const params = new URLSearchParams({
    w: String(width),
    q: String(quality),
    f: format,
  });

  return `${fullPath}?${params.toString()}`;
}

/**
 * 이미지 최적화 규칙
 */
export const IMAGE_RULES = {
  // 권장 용량
  maxSize: 200 * 1024, // 200KB
  // 권장 비율
  aspectRatio: "16:9",
  // CDN 기본 설정
  defaultWidth: 800,
  defaultQuality: 70,
  defaultFormat: "webp" as const,
} as const;
