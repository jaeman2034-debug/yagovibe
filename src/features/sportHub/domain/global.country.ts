/**
 * 🔥 Global Country - 국가별 설정
 * 
 * 결제, 지도, 협회 연동 국가별 분리
 */

import type { Country, CountryInfo, Lang } from "./global.types";
import { COUNTRY_LANG } from "./global.types";

/**
 * 국가별 설정
 */
export const COUNTRY_CONFIGS: Record<Country, CountryInfo> = {
  KR: {
    code: "KR",
    name: {
      ko: "대한민국",
      en: "South Korea",
      ja: "韓国",
      vi: "Hàn Quốc",
      id: "Korea Selatan",
      th: "เกาหลีใต้",
    },
    defaultLang: "ko",
    currency: "KRW",
    timezone: "Asia/Seoul",
    paymentProviders: ["tosspay", "kcp", "iamport"],
    mapProviders: ["kakao_map", "naver_map"],
  },
  JP: {
    code: "JP",
    name: {
      ko: "일본",
      en: "Japan",
      ja: "日本",
      vi: "Nhật Bản",
      id: "Jepang",
      th: "ญี่ปุ่น",
    },
    defaultLang: "ja",
    currency: "JPY",
    timezone: "Asia/Tokyo",
    paymentProviders: ["paypay", "stripe"],
    mapProviders: ["google_map"],
  },
  VN: {
    code: "VN",
    name: {
      ko: "베트남",
      en: "Vietnam",
      ja: "ベトナム",
      vi: "Việt Nam",
      id: "Vietnam",
      th: "เวียดนาม",
    },
    defaultLang: "vi",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh",
    paymentProviders: ["momo", "vnpay"],
    mapProviders: ["google_map"],
  },
  ID: {
    code: "ID",
    name: {
      ko: "인도네시아",
      en: "Indonesia",
      ja: "インドネシア",
      vi: "Indonesia",
      id: "Indonesia",
      th: "อินโดนีเซีย",
    },
    defaultLang: "id",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    paymentProviders: ["ovo", "dana"],
    mapProviders: ["google_map"],
  },
  TH: {
    code: "TH",
    name: {
      ko: "태국",
      en: "Thailand",
      ja: "タイ",
      vi: "Thái Lan",
      id: "Thailand",
      th: "ประเทศไทย",
    },
    defaultLang: "th",
    currency: "THB",
    timezone: "Asia/Bangkok",
    paymentProviders: ["promptpay", "truemoney"],
    mapProviders: ["google_map"],
  },
  US: {
    code: "US",
    name: {
      ko: "미국",
      en: "United States",
      ja: "アメリカ",
      vi: "Hoa Kỳ",
      id: "Amerika Serikat",
      th: "สหรัฐอเมริกา",
    },
    defaultLang: "en",
    currency: "USD",
    timezone: "America/New_York",
    paymentProviders: ["stripe", "paypal"],
    mapProviders: ["google_map"],
  },
  GB: {
    code: "GB",
    name: {
      ko: "영국",
      en: "United Kingdom",
      ja: "イギリス",
      vi: "Vương quốc Anh",
      id: "Inggris",
      th: "สหราชอาณาจักร",
    },
    defaultLang: "en",
    currency: "GBP",
    timezone: "Europe/London",
    paymentProviders: ["stripe", "paypal"],
    mapProviders: ["google_map"],
  },
};

/**
 * 국가별 결제 제공자 조회
 */
export function getPaymentProviders(country: Country): string[] {
  return COUNTRY_CONFIGS[country].paymentProviders;
}

/**
 * 국가별 지도 제공자 조회
 */
export function getMapProviders(country: Country): string[] {
  return COUNTRY_CONFIGS[country].mapProviders;
}

/**
 * 국가별 기본 언어 조회
 */
export function getDefaultLanguage(country: Country): Lang {
  return COUNTRY_CONFIGS[country].defaultLang;
}

/**
 * 국가별 통화 조회
 */
export function getCurrency(country: Country): string {
  return COUNTRY_CONFIGS[country].currency;
}

/**
 * 통화 포맷팅
 */
export function formatCurrency(amount: number, country: Country): string {
  const currency = getCurrency(country);
  const lang = getDefaultLanguage(country);
  
  return new Intl.NumberFormat(`${country}-${lang}`, {
    style: "currency",
    currency,
  }).format(amount);
}
