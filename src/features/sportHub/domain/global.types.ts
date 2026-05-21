/**
 * 🔥 Global Types - 글로벌 확장 도메인 모델
 * 
 * 국가 단위 플랫폼화
 */

/**
 * 국가 코드
 */
export type Country = "KR" | "JP" | "VN" | "ID" | "TH" | "US" | "GB";

/**
 * 언어 코드
 */
export type Lang = "ko" | "en" | "ja" | "vi" | "id" | "th";

/**
 * 국가별 언어 매핑
 */
export const COUNTRY_LANG: Record<Country, Lang> = {
  KR: "ko",
  JP: "ja",
  VN: "vi",
  ID: "id",
  TH: "th",
  US: "en",
  GB: "en",
};

/**
 * 국가 정보
 */
export type CountryInfo = {
  code: Country;
  name: Record<Lang, string>;
  defaultLang: Lang;
  currency: string;
  timezone: string;
  paymentProviders: string[];
  mapProviders: string[];
};

/**
 * 글로벌 Region
 */
export type GlobalRegion = {
  country: Country;
  code: string; // seoul, tokyo, hanoi
  name: Record<Lang, string>;
};

/**
 * 글로벌 리그
 */
export type GlobalLeague = {
  id: string;
  country: Country;
  
  name: Record<Lang, string>;
  description?: Record<Lang, string>;
  
  startAt: string;
  endAt: string;
  
  federation: string; // 협회명
  federationId?: string;
  
  status: "READY" | "RUNNING" | "ENDED";
  
  createdAt: string;
  updatedAt: string;
};

/**
 * 다국어 텍스트
 */
export type I18nText = Record<Lang, string>;

/**
 * 번역 키
 */
export type TranslationKey =
  | "story.cta.reserve"
  | "story.cta.view_team"
  | "story.cta.view_schedule"
  | "story.cta.browse_market"
  | "ground.price_from"
  | "ground.next_slot"
  | "team.recruit"
  | "league.upcoming"
  | "common.loading"
  | "common.error";

/**
 * 번역 사전
 */
export type TranslationDict = Record<TranslationKey, I18nText>;
