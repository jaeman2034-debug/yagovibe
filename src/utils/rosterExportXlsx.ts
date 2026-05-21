/**
 * 🔥 연령 검증 결과 엑셀 출력
 */

import * as XLSX from "xlsx";
import type { ClassifiedRow } from "./rosterAge";

function toSheetRows(rows: ClassifiedRow[]) {
  return rows.map(r => ({
    이름: r.name,
    생년월일_원문: r.birthDateRaw,
    생년월일_정규화: r.birthDateISO ?? "",
    출생연도: r.birthYear ?? "",
    판정: r.ageCheck.eligible === true ? "가능" : r.ageCheck.eligible === false ? "불가" : "확인필요",
    사유: r.ageCheck.reason,
    포지션: r.position ?? "",
    연락처: r.phone ?? "",
    등번호: r.jerseyNo ?? "",
    비고: r.memo ?? "",
  }));
}

export function exportAgeCheckWorkbook(args: {
  fileName: string;
  ageRuleText: string;
  eligible: ClassifiedRow[];
  ineligible: ClassifiedRow[];
  needsReview: ClassifiedRow[];
}) {
  const wb = XLSX.utils.book_new();

  const summary = [
    { 항목: "연령 기준", 값: args.ageRuleText },
    { 항목: "가능", 값: args.eligible.length },
    { 항목: "불가", 값: args.ineligible.length },
    { 항목: "확인필요", 값: args.needsReview.length },
    { 항목: "생성일시", 값: new Date().toISOString() },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "요약");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(args.eligible)), "출전가능");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(args.ineligible)), "연령불가");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(args.needsReview)), "확인필요");

  XLSX.writeFile(wb, args.fileName);
}

