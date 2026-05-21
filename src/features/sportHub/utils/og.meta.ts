/**
 * 🔥 OG Meta - Open Graph 메타 태그 생성
 * 
 * SNS 공유 시 미리보기
 */

import type { ShareMetadata, OGMeta } from "../domain/superapp.types";

/**
 * OG 메타 태그 생성
 */
export function generateOGMeta(metadata: ShareMetadata): OGMeta {
  return {
    "og:title": metadata.title,
    "og:description": metadata.description,
    "og:image": metadata.imageUrl || "https://hub.com/og-default.jpg",
    "og:url": metadata.url,
    "og:type": metadata.type === "story" ? "article" : "website",
  };
}

/**
 * HTML에 OG 메타 태그 주입
 */
export function injectOGMeta(metadata: ShareMetadata): void {
  const ogMeta = generateOGMeta(metadata);

  // 기존 OG 태그 제거
  const existingTags = document.querySelectorAll('meta[property^="og:"]');
  existingTags.forEach((tag) => tag.remove());

  // 새 OG 태그 추가
  for (const [key, value] of Object.entries(ogMeta)) {
    const meta = document.createElement("meta");
    meta.setAttribute("property", key);
    meta.setAttribute("content", value);
    document.head.appendChild(meta);
  }
}
