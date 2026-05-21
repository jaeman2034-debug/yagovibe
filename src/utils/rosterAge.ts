/**
 * 🔥 선수 명단 파싱 + 연령 판별 유틸리티
 * 
 * 복붙 텍스트/엑셀에서 선수 정보 추출 및 연령 적합성 자동 판별
 */

export type AgeRule =
  | { type: "OPEN"; description: string }
  | { type: "U"; maxBirthYear: number; description: string }
  | { type: "OVER"; minBirthYear: number; description: string };

export type ParsedPlayerRow = {
  name: string;
  birthDateRaw: string;     // 원문
  birthDateISO?: string;    // YYYY-MM-DD
  birthYear?: number;
  position?: string;
  phone?: string;
  jerseyNo?: string;
  memo?: string;
};

export type AgeCheck = {
  eligible: boolean | null; // null = 판단불가(입력 누락/형식 오류)
  reason: "OK" | "AGE_OVER" | "AGE_UNDER" | "BIRTH_MISSING" | "BIRTH_INVALID" | "RULE_MISSING";
};

export type ClassifiedRow = ParsedPlayerRow & {
  ageCheck: AgeCheck;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function normalizeBirthDate(input: string): { iso?: string; year?: number; reason?: AgeCheck["reason"] } {
  const s = (input || "").trim();
  if (!s) return { reason: "BIRTH_MISSING" };

  // 허용: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YYYYMMDD
  const cleaned = s.replace(/\s/g, "");

  // YYYYMMDD
  if (/^\d{8}$/.test(cleaned)) {
    const y = Number(cleaned.slice(0, 4));
    const m = Number(cleaned.slice(4, 6));
    const d = Number(cleaned.slice(6, 8));
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { iso: `${y}-${pad2(m)}-${pad2(d)}`, year: y };
    }
    return { reason: "BIRTH_INVALID" };
  }

  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  const m = cleaned.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (y >= 1900 && y <= 2100 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return { iso: `${y}-${pad2(mm)}-${pad2(dd)}`, year: y };
    }
    return { reason: "BIRTH_INVALID" };
  }

  // 출생연도만 들어온 경우(예: 2011)
  if (/^\d{4}$/.test(cleaned)) {
    const y = Number(cleaned);
    if (y >= 1900 && y <= 2100) {
      // 날짜는 불완전하지만 연도 판별은 가능
      return { iso: `${y}-01-01`, year: y };
    }
    return { reason: "BIRTH_INVALID" };
  }

  return { reason: "BIRTH_INVALID" };
}

export function checkAge(rule: AgeRule | undefined, birthYear?: number, birthRaw?: string): AgeCheck {
  if (!rule) return { eligible: null, reason: "RULE_MISSING" };

  if (!birthRaw || !birthRaw.trim()) return { eligible: null, reason: "BIRTH_MISSING" };
  if (!birthYear) return { eligible: null, reason: "BIRTH_INVALID" };

  if (rule.type === "OPEN") return { eligible: true, reason: "OK" };

  if (rule.type === "U") {
    // U: maxBirthYear 이하(=더 최근 출생일수록 OK). 예: 2013년생 이하 → 2013,2014,... OK
    // 즉 birthYear >= maxBirthYear 이면 OK
    if (birthYear >= rule.maxBirthYear) return { eligible: true, reason: "OK" };
    return { eligible: false, reason: "AGE_OVER" }; // 더 나이가 많음(연령 초과)
  }

  // OVER: minBirthYear 이상(=더 예전 출생일수록 OK). 예: 1990년생 이상(=1990,1989...)은 용어가 헷갈려서
  // 여기서는 "minBirthYear 이상"을 '출생연도 >= minBirthYear'로 해석(더 어린 쪽).
  // 만약 "1990년생 이상"을 '1990 이전(나이 많음) 허용'으로 쓰는 운영이라면 규칙 필드명을 바꾸는 게 맞음.
  if (birthYear >= rule.minBirthYear) return { eligible: true, reason: "OK" };
  return { eligible: false, reason: "AGE_UNDER" };
}

/**
 * 복붙 텍스트 파서
 * - 탭/콤마/파이프(|) 구분 자동 인식
 * - 첫 줄 헤더가 "이름" 포함이면 헤더로 처리
 * 기본 컬럼 순서: 이름, 생년월일, 포지션, 연락처, 유니폼번호, 비고
 */
export function parsePastedText(text: string): ParsedPlayerRow[] {
  const raw = (text || "").trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const guessDelim = (line: string) => {
    if (line.includes("\t")) return "\t";
    if (line.includes("|")) return "|";
    if (line.includes(",")) return ",";
    return "\t"; // 기본
  };

  const delim = guessDelim(lines[0]);
  const split = (line: string) => line.split(delim).map(s => s.trim());

  let startIdx = 0;
  const header = split(lines[0]).join(" ");
  if (header.includes("이름") || header.toLowerCase().includes("name")) startIdx = 1;

  const rows: ParsedPlayerRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = split(lines[i]);
    const [name, birthDateRaw, position, phone, jerseyNo, memo] = cols;
    if (!name?.trim()) continue;
    rows.push({ name: name.trim(), birthDateRaw: (birthDateRaw || "").trim(), position, phone, jerseyNo, memo });
  }
  return rows;
}

export function classifyRoster(rows: ParsedPlayerRow[], rule?: AgeRule): {
  all: ClassifiedRow[];
  eligible: ClassifiedRow[];
  ineligible: ClassifiedRow[];
  needsReview: ClassifiedRow[];
} {
  const all: ClassifiedRow[] = rows.map(r => {
    const n = normalizeBirthDate(r.birthDateRaw);
    const ageCheck = checkAge(rule, n.year, r.birthDateRaw);
    return { ...r, birthDateISO: n.iso, birthYear: n.year, ageCheck };
  });

  // 기본 정렬: 이름 → 출생연도(오름/내림은 취향인데 실무는 연도 내림(어린 순) 추천)
  all.sort((a, b) => {
    const an = a.name.localeCompare(b.name, "ko");
    if (an !== 0) return an;
    return (b.birthYear ?? -1) - (a.birthYear ?? -1);
  });

  const eligible = all.filter(x => x.ageCheck.eligible === true);
  const ineligible = all.filter(x => x.ageCheck.eligible === false);
  const needsReview = all.filter(x => x.ageCheck.eligible === null);

  return { all, eligible, ineligible, needsReview };
}

