/**
 * 🔥 Global SEO - SEO 최적화
 * 
 * hreflang, 국가 도메인, OG 다국어
 */

import type { Country, Lang } from "../domain/global.types";
import type { ShareMetadata } from "../domain/superapp.types";
import { COUNTRY_LANG } from "../domain/global.types";

/**
 * hreflang 태그 생성
 */
export function generateHreflangTags(
  path: string,
  countries: Country[],
  baseUrl: string = "https://hub.com"
): Array<{ rel: string; hreflang: string; href: string }> {
  return countries.map((country) => {
    const lang = COUNTRY_LANG[country];
    return {
      rel: "alternate",
      hreflang: `${lang}-${country}`,
      href: `${baseUrl}/${country.toLowerCase()}${path}`,
    };
  });
}

/**
 * hreflang 태그 주입
 */
export function injectHreflangTags(
  path: string,
  countries: Country[]
): void {
  // 기존 hreflang 태그 제거
  const existingTags = document.querySelectorAll('link[rel="alternate"][hreflang]');
  existingTags.forEach((tag) => tag.remove());

  // 새 hreflang 태그 추가
  const tags = generateHreflangTags(path, countries);
  for (const tag of tags) {
    const link = document.createElement("link");
    link.rel = tag.rel;
    link.hreflang = tag.hreflang;
    link.href = tag.href;
    document.head.appendChild(link);
  }
}

/**
 * 다국어 OG 메타 생성
 */
export function generateMultilingualOG(
  metadata: ShareMetadata,
  country: Country,
  lang: Lang
): Record<string, string> {
  return {
    "og:title": metadata.title,
    "og:description": metadata.description,
    "og:image": metadata.imageUrl || "",
    "og:url": metadata.url,
    "og:locale": `${lang}_${country}`,
    "og:locale:alternate": Object.entries(COUNTRY_LANG)
      .filter(([c]) => c !== country)
      .map(([c, l]) => `${l}_${c}`)
      .join(", "),
  };
}
