/**
 * PDF를 CSV로 오인해 업로드했을 때 등으로 표시명이 깨진 경우 탐지
 */
export function isCorruptedMemberDisplayName(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return false;

  // PDF 연산자·키워드
  if (n.includes("/")) return true;
  if (/CropBox/i.test(n)) return true;
  if (/\/Root\b/i.test(n) || n.includes("/Root")) return true;
  if (/\/Type\b/i.test(n)) return true;
  if (/[0-9]{6,}/.test(n)) return true;

  // PDF 객체 줄 ("3 0 obj") 및 구조 토큰
  if (/\b\d+\s+\d+\s+obj\b/i.test(n)) return true;
  if (/\b(endobj|startxref|xref|trailer)\b/i.test(n)) return true;
  if (/\bstream\b/i.test(n) && n.length > 12) return true;

  // UTF-8 깨짐·대체 문자
  if (n.includes("\uFFFD")) return true;

  // 느낌표·물음표 덩어리 (바이너리가 텍스트로 붙을 때 흔함)
  if (/[!?]{3,}/.test(n)) return true;

  // 비현실적으로 긴 표시명
  if (n.length > 40) return true;

  // 한글 실명이 거의 없고 기호 비율이 높음
  if (n.length >= 10) {
    const nonOk = n.replace(/[\s0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ.,·\-']/g, "").length;
    if (nonOk / n.length >= 0.2) return true;
  }

  // 짧은 라틴+기호 난립 (예: Ks}=ZüW)
  if (n.length <= 32 && !/[가-힣]/.test(n)) {
    const weird = (n.match(/[=<>{}[\]|\\^~`]/g) || []).length;
    if (weird >= 2) return true;
  }

  return false;
}

/** 일괄 등록(파일/텍스트) 시 이름 행으로 부적절하면 스킵 */
export function shouldSkipBulkImportMemberName(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return true;
  if (isCorruptedMemberDisplayName(n)) return true;
  if (n.length > 30) return true;
  return false;
}

export function looksLikePdfText(text: string): boolean {
  const t = (text || "").trimStart();
  return t.startsWith("%PDF");
}
