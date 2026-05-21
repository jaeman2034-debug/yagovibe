/**
 * 날짜 파싱 엔진 (Date NLU)
 * 
 * 자연어 텍스트에서 날짜 정보를 추출하여 구조화된 날짜 Intent로 변환합니다.
 */

export type DateIntent =
  | "today"
  | "tomorrow"
  | "dayAfterTomorrow"
  | "thisWeek"
  | "nextWeek"
  | {
      type: "absoluteDate";
      date: string; // YYYY-MM-DD 형식
    }
  | null;

/**
 * 텍스트에서 날짜 Intent를 파싱합니다.
 * 
 * @param text - 분석할 텍스트
 * @returns 파싱된 DateIntent
 */
export function parseDateIntent(text: string): DateIntent {
  if (!text || typeof text !== "string") {
    return null;
  }

  const t = text.toLowerCase().trim();
  const today = new Date();

  // 🔥 1) 오늘
  if (t.includes("오늘")) {
    return "today";
  }

  // 🔥 2) 내일
  if (t.includes("내일")) {
    return "tomorrow";
  }

  // 🔥 3) 모레
  if (t.includes("모레")) {
    return "dayAfterTomorrow";
  }

  // 🔥 4) 이번 주
  if (t.includes("이번 주") || t.includes("이번주") || t.includes("이번 주")) {
    return "thisWeek";
  }

  // 🔥 5) 다음 주
  if (t.includes("다음 주") || t.includes("다음주") || t.includes("다음 주")) {
    return "nextWeek";
  }

  // 🔥 6) 절대 날짜 (년/월/일): "2025년 3월 17일"
  const fullDateRegex = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
  const fullDateMatch = t.match(fullDateRegex);

  if (fullDateMatch) {
    const year = Number(fullDateMatch[1]);
    const month = Number(fullDateMatch[2]);
    const day = Number(fullDateMatch[3]);

    // 유효성 검사
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const formatted = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return {
        type: "absoluteDate",
        date: formatted,
      };
    }
  }

  // 🔥 7) 절대 날짜 (월/일): "2월 3일", "3월 17일" (올해로 가정)
  const monthDayRegex = /(\d{1,2})월\s*(\d{1,2})일/;
  const monthDayMatch = t.match(monthDayRegex);

  if (monthDayMatch) {
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);

    // 유효성 검사
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = today.getFullYear();
      
      // 과거 날짜인 경우 내년으로 처리
      const targetDate = new Date(year, month - 1, day);
      const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (targetDate < currentDate) {
        // 과거 날짜면 내년으로 설정
        const formatted = `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          type: "absoluteDate",
          date: formatted,
        };
      } else {
        // 미래 날짜면 올해로 설정
        const formatted = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          type: "absoluteDate",
          date: formatted,
        };
      }
    }
  }

  // 🔥 8) 상대적 날짜 표현: "다음주 월요일", "이번주 금요일" (추후 확장 가능)
  // TODO: 요일 기반 날짜 파싱 추가

  return null;
}

/**
 * DateIntent를 실제 Date 객체로 변환합니다.
 * 
 * @param dateIntent - 변환할 DateIntent
 * @returns Date 객체 또는 null
 */
export function dateIntentToDate(dateIntent: DateIntent): Date | null {
  if (!dateIntent) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateIntent === "today") {
    return new Date(today);
  }

  if (dateIntent === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  if (dateIntent === "dayAfterTomorrow") {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter;
  }

  if (dateIntent === "thisWeek") {
    // 이번 주 월요일
    const monday = new Date(today);
    const dayOfWeek = monday.getDay();
    const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 월요일로 조정
    monday.setDate(diff);
    return monday;
  }

  if (dateIntent === "nextWeek") {
    // 다음 주 월요일
    const nextMonday = new Date(today);
    const dayOfWeek = nextMonday.getDay();
    const diff = nextMonday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + 7; // 다음 주 월요일
    nextMonday.setDate(diff);
    return nextMonday;
  }

  if (dateIntent.type === "absoluteDate") {
    return new Date(dateIntent.date);
  }

  return null;
}

/**
 * DateIntent를 사용자 친화적인 문자열로 변환합니다.
 * 
 * @param dateIntent - 변환할 DateIntent
 * @returns 사용자 친화적인 날짜 문자열
 */
export function dateIntentToDisplayString(dateIntent: DateIntent): string {
  if (!dateIntent) {
    return "";
  }

  if (dateIntent === "today") {
    return "오늘";
  }

  if (dateIntent === "tomorrow") {
    return "내일";
  }

  if (dateIntent === "dayAfterTomorrow") {
    return "모레";
  }

  if (dateIntent === "thisWeek") {
    return "이번 주";
  }

  if (dateIntent === "nextWeek") {
    return "다음 주";
  }

  if (dateIntent.type === "absoluteDate") {
    const date = new Date(dateIntent.date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  }

  return "";
}

