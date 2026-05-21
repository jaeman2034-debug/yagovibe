/**
 * 🔥 Global League - 글로벌 리그 연동
 * 
 * 협회 연동 국제화
 */

import type { GlobalLeague, Country, Lang } from "./global.types";
import type { Story } from "./story.types";
import { getTextByLang } from "./global.i18n";

/**
 * 글로벌 리그 → Story 변환
 */
export function globalLeagueToStory(
  league: GlobalLeague,
  lang: Lang,
  region: string
): Story {
  const now = new Date().toISOString();
  
  return {
    id: `global-league-${league.id}`,
    region: region as any, // 실제로는 GlobalRegion 타입 사용
    source: "협회",
    category: "대회",
    
    title: getTextByLang(league.name, lang),
    subtitle: league.description
      ? getTextByLang(league.description, lang)
      : `${league.federation} ${getTextByLang(league.name, lang)}`,
    
    status: league.status === "RUNNING" ? "PUBLISHED" : "DRAFT",
    
    startAt: league.startAt,
    endAt: league.endAt,
    
    priority: 95, // 글로벌 리그는 높은 우선순위
    
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 콘텐츠 우선순위 (협회 원문 → AI 번역 → 운영 교정)
 */
export type ContentSource = "original" | "ai_translated" | "manual_edited";

export type LocalizedContent = {
  lang: Lang;
  text: string;
  source: ContentSource;
  translatedAt?: string;
  editedBy?: string;
};

/**
 * 콘텐츠 현지화
 */
export function localizeContent(
  original: string,
  targetLang: Lang,
  sourceLang: Lang = "en"
): LocalizedContent {
  // 실제 구현: AI 번역 API 호출
  // 임시: 원문 반환
  return {
    lang: targetLang,
    text: original, // TODO: AI 번역
    source: sourceLang === targetLang ? "original" : "ai_translated",
    translatedAt: new Date().toISOString(),
  };
}
