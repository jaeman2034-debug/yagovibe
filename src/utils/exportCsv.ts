/**
 * 🔥 운영 로그 CSV Export 유틸
 * 
 * 기능:
 * - opLogs 배열을 CSV 형식으로 변환
 * - 필터된 로그만 다운로드
 * - 엑셀/보고서 바로 사용 가능
 */

export function exportOpLogsToCSV(logs: any[], filename = "op-logs.csv") {
  const headers = ["timestamp", "type", "level", "actorRole", "actorUid", "message"];
  
  const rows = logs.map((l) => [
    l.ts?.toDate?.()?.toISOString?.() ?? "",
    l.type ?? "",
    l.level ?? "",
    l.actorRole ?? "",
    l.actorUid ?? "",
    (l.message ?? "").replace(/"/g, '""'), // CSV 이스케이프
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  // BOM 추가 (한글 깨짐 방지)
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
