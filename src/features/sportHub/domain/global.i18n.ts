/**
 * 🔥 Global i18n - 다국어 번역 시스템
 * 
 * 콘텐츠 자동 현지화
 */

import type { Lang, TranslationKey, TranslationDict, I18nText } from "./global.types";

/**
 * 기본 번역 사전
 */
export const DEFAULT_TRANSLATIONS: TranslationDict = {
  "story.cta.reserve": {
    ko: "예약하기",
    en: "Book Now",
    ja: "予約する",
    vi: "Đặt ngay",
    id: "Pesan Sekarang",
    th: "จองเลย",
  },
  "story.cta.view_team": {
    ko: "팀 찾기",
    en: "Find Team",
    ja: "チームを探す",
    vi: "Tìm đội",
    id: "Cari Tim",
    th: "หาทีม",
  },
  "story.cta.view_schedule": {
    ko: "일정 보기",
    en: "View Schedule",
    ja: "スケジュールを見る",
    vi: "Xem lịch",
    id: "Lihat Jadwal",
    th: "ดูตาราง",
  },
  "story.cta.browse_market": {
    ko: "보러가기",
    en: "Browse",
    ja: "見る",
    vi: "Xem",
    id: "Lihat",
    th: "ดู",
  },
  "ground.price_from": {
    ko: "부터",
    en: "from",
    ja: "から",
    vi: "từ",
    id: "dari",
    th: "เริ่มต้น",
  },
  "ground.next_slot": {
    ko: "다음:",
    en: "Next:",
    ja: "次:",
    vi: "Tiếp theo:",
    id: "Berikutnya:",
    th: "ถัดไป:",
  },
  "team.recruit": {
    ko: "팀원 모집",
    en: "Recruiting",
    ja: "メンバー募集",
    vi: "Tuyển thành viên",
    id: "Merekrut",
    th: "รับสมัคร",
  },
  "league.upcoming": {
    ko: "다가오는 경기",
    en: "Upcoming Match",
    ja: "次の試合",
    vi: "Trận đấu sắp tới",
    id: "Pertandingan Mendatang",
    th: "นัดถัดไป",
  },
  "common.loading": {
    ko: "로딩 중...",
    en: "Loading...",
    ja: "読み込み中...",
    vi: "Đang tải...",
    id: "Memuat...",
    th: "กำลังโหลด...",
  },
  "common.error": {
    ko: "오류가 발생했습니다",
    en: "An error occurred",
    ja: "エラーが発生しました",
    vi: "Đã xảy ra lỗi",
    id: "Terjadi kesalahan",
    th: "เกิดข้อผิดพลาด",
  },
};

/**
 * 번역 조회
 */
export function t(key: TranslationKey, lang: Lang): string {
  return DEFAULT_TRANSLATIONS[key]?.[lang] || DEFAULT_TRANSLATIONS[key]?.["en"] || key;
}

/**
 * 다국어 텍스트에서 언어별 조회
 */
export function getTextByLang(text: I18nText, lang: Lang, fallback: Lang = "en"): string {
  return text[lang] || text[fallback] || Object.values(text)[0] || "";
}

/**
 * 현재 언어 감지
 */
export function detectLanguage(): Lang {
  // 1. localStorage 확인
  const saved = localStorage.getItem("app_lang");
  if (saved && ["ko", "en", "ja", "vi", "id", "th"].includes(saved)) {
    return saved as Lang;
  }

  // 2. 브라우저 언어
  const browserLang = navigator.language.split("-")[0];
  if (["ko", "en", "ja", "vi", "id", "th"].includes(browserLang)) {
    return browserLang as Lang;
  }

  // 3. 기본값
  return "en";
}

/**
 * 언어 설정 저장
 */
export function setLanguage(lang: Lang): void {
  localStorage.setItem("app_lang", lang);
}
