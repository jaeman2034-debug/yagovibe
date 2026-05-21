/**
 * 🔥 구글 시트 템플릿 생성 및 연동 유틸리티
 * 
 * 단계별 로드맵:
 * 1단계: 템플릿 링크 제공 (사본 만들기)
 * 2단계: 시트 URL 직접 연동 (OAuth 2.0)
 * 3단계: 실시간 동기화
 */

/**
 * 구글 시트 템플릿 구조
 */
export interface GoogleSheetsTemplate {
  /** 템플릿 스프레드시트 ID */
  templateId: string;
  /** 템플릿 이름 */
  name: string;
  /** "사본 만들기" 링크 */
  copyLink: string;
  /** 설명 */
  description: string;
}

/**
 * 표준 회원 등록 템플릿 구조
 */
export const MEMBER_TEMPLATE_COLUMNS = {
  name: "이름*",
  phone: "전화번호",
  jerseyNumber: "배번",
  role: "역할",
  feePlan: "회비플랜",
  squad: "소속",
  memo: "메모",
} as const;

/**
 * 역할 드롭다운 옵션
 */
export const ROLE_OPTIONS = [
  "일반",
  "회장",
  "부회장",
  "총무",
  "감독",
  "코치",
  "감사",
  "상벌위원장",
] as const;

/**
 * 회비플랜 드롭다운 옵션
 */
export const FEE_PLAN_OPTIONS = [
  "월회비",
  "연회비",
  "면제",
] as const;

/**
 * 소속 드롭다운 옵션
 */
export const SQUAD_OPTIONS = [
  "청룡",
  "백호",
] as const;

/**
 * 구글 시트 템플릿 "사본 만들기" 링크 생성
 * 
 * @param templateId 템플릿 스프레드시트 ID
 * @returns "사본 만들기" URL
 */
export function createGoogleSheetsCopyLink(templateId: string): string {
  return `https://docs.google.com/spreadsheets/d/${templateId}/copy`;
}

/**
 * 구글 시트 URL에서 스프레드시트 ID 추출
 * 
 * @param url 구글 시트 URL (다양한 형식 지원)
 * @returns 스프레드시트 ID 또는 null
 */
export function extractSpreadsheetId(url: string): string | null {
  // 다양한 URL 형식 지원
  // https://docs.google.com/spreadsheets/d/{ID}/edit
  // https://docs.google.com/spreadsheets/d/{ID}
  // https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
  
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * 구글 시트 공개 URL에서 CSV 데이터 가져오기
 * 
 * @param spreadsheetId 스프레드시트 ID
 * @param sheetName 시트 이름 (기본값: 첫 번째 시트)
 * @returns CSV 데이터 (텍스트)
 */
export async function fetchGoogleSheetsAsCSV(
  spreadsheetId: string,
  sheetName?: string
): Promise<string> {
  // 공개 시트인 경우 CSV로 직접 다운로드 가능
  const url = sheetName
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
    : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`구글 시트 데이터를 가져올 수 없습니다: ${response.statusText}`);
  }
  
  return await response.text();
}

/**
 * CSV 텍스트를 파싱하여 객체 배열로 변환
 * 
 * @param csvText CSV 텍스트
 * @returns 파싱된 데이터 배열
 */
export function parseCSVToObjects(csvText: string): any[] {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];
  
  // 헤더 추출
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  
  // 데이터 행 파싱
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    if (values.every((v) => !v)) continue; // 빈 행 스킵
    
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * 구글 시트 템플릿 예시 데이터 생성
 */
export function generateTemplateExampleData(): any[] {
  return [
    {
      [MEMBER_TEMPLATE_COLUMNS.name]: "손승호",
      [MEMBER_TEMPLATE_COLUMNS.phone]: "010-1234-5678",
      [MEMBER_TEMPLATE_COLUMNS.jerseyNumber]: "10",
      [MEMBER_TEMPLATE_COLUMNS.role]: "회장",
      [MEMBER_TEMPLATE_COLUMNS.feePlan]: "면제",
      [MEMBER_TEMPLATE_COLUMNS.squad]: "",
      [MEMBER_TEMPLATE_COLUMNS.memo]: "운영총괄",
    },
    {
      [MEMBER_TEMPLATE_COLUMNS.name]: "김광일",
      [MEMBER_TEMPLATE_COLUMNS.phone]: "010-2345-6789",
      [MEMBER_TEMPLATE_COLUMNS.jerseyNumber]: "7",
      [MEMBER_TEMPLATE_COLUMNS.role]: "일반",
      [MEMBER_TEMPLATE_COLUMNS.feePlan]: "월회비",
      [MEMBER_TEMPLATE_COLUMNS.squad]: "청룡",
      [MEMBER_TEMPLATE_COLUMNS.memo]: "",
    },
  ];
}

