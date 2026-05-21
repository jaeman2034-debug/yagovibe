/**
 * 🔥 엑셀/CSV 파일에서 선수 명단 파싱
 */

import * as XLSX from "xlsx";
import type { ParsedPlayerRow } from "./rosterAge";

/**
 * 엑셀/CSV에서 선수 목록 추출
 * 기대 헤더(한국어/영문 혼용 허용):
 * - 이름/name
 * - 생년월일/birth/birthDate/dob
 * - 포지션/position
 * - 연락처/phone
 * - 유니폼번호/jersey/no
 * - 비고/memo
 */
export async function parseRosterFile(file: File): Promise<ParsedPlayerRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

  const pick = (obj: Record<string, any>, keys: string[]) => {
    for (const k of keys) {
      if (k in obj) return String(obj[k] ?? "").trim();
    }
    // 대소문자/공백 무시 매칭
    const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");
    const map = Object.keys(obj).reduce<Record<string, string>>((acc, key) => {
      acc[norm(key)] = key;
      return acc;
    }, {});
    for (const k of keys) {
      const nk = norm(k);
      if (map[nk]) return String(obj[map[nk]] ?? "").trim();
    }
    return "";
  };

  const rows: ParsedPlayerRow[] = json
    .map((r) => {
      const name = pick(r, ["이름", "name", "성명"]);
      const birthDateRaw = pick(r, ["생년월일", "birthDate", "dob", "생년", "출생", "birth"]);
      const position = pick(r, ["포지션", "position"]);
      const phone = pick(r, ["연락처", "phone", "휴대폰"]);
      const jerseyNo = pick(r, ["유니폼번호", "jersey", "no", "등번호"]);
      const memo = pick(r, ["비고", "memo", "note"]);
      if (!name) return null;
      return { name, birthDateRaw, position, phone, jerseyNo, memo };
    })
    .filter(Boolean) as ParsedPlayerRow[];

  return rows;
}

