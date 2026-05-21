/**
 * 🔥 SmartImage - 축구 허브 전용 이미지 컴포넌트
 * 
 * 3단계 로딩 모델:
 * 1. Placeholder (즉시)
 * 2. 저해상 WebP
 * 3. 원본 CDN
 * 
 * 목표:
 * - 저속망에서도 LCP 안정
 * - 스토리 존 깜빡임 0
 * - 이미지 없어도 UI 깨짐 금지
 */

import { useState } from "react";

/**
 * CDN URL 변환
 */
export function getCdnUrl(path: string, options?: {
  width?: number;
  quality?: number;
  format?: "webp" | "jpg" | "png";
}): string {
  const { width = 800, quality = 70, format = "webp" } = options || {};
  
  // CDN 베이스 URL (환경변수 또는 기본값)
  const CDN_BASE = import.meta.env.VITE_CDN_BASE || "https://cdn.your.com";
  
  // 상대 경로인 경우 CDN 베이스 추가
  const fullPath = path.startsWith("http") ? path : `${CDN_BASE}/${path}`;
  
  // URL 파라미터 추가
  const params = new URLSearchParams({
    w: String(width),
    q: String(quality),
    f: format,
  });
  
  return `${fullPath}?${params.toString()}`;
}

/**
 * Placeholder SVG (단색 그라디언트)
 */
const PLACEHOLDER_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9f6e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dy=".3em" opacity="0.3">⚽</text>
</svg>
`)}`;

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
}

export default function SmartImage({
  src,
  alt,
  className = "",
  aspectRatio = "16/9",
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // 이미지 URL 결정
  const imageUrl = src
    ? getCdnUrl(src, { width: 800, quality: 70, format: "webp" })
    : PLACEHOLDER_SVG;

  // aspect-ratio 계산
  const aspectRatioClass =
    aspectRatio === "16/9" ? "aspect-video" :
    aspectRatio === "4/3" ? "aspect-[4/3]" :
    "aspect-square";

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Placeholder (항상 표시, CLS 방지) */}
      <img
        src={PLACEHOLDER_SVG}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 실제 이미지 (로드 완료 시 표시) */}
      {!error && (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`
            absolute inset-0 w-full h-full object-cover
            transition-opacity duration-200
            ${loaded ? "opacity-100" : "opacity-0"}
          `}
        />
      )}
    </div>
  );
}
