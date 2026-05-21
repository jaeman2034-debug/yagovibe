/**
 * 🔥 구글 스프레드시트 완전 연동 엔진
 * 
 * 전략:
 * - 클라이언트 사이드: 공개 시트 CSV 다운로드 방식
 * - 서버 사이드: Google Sheets API (향후 Firebase Functions로 구현)
 * - 단방향 동기화 (시트 → 앱)
 * - 검증 + 미리보기 + 확인 후 저장
 * 
 * 참고: googleapis는 서버 사이드 전용이므로 클라이언트에서는 CSV 다운로드 방식 사용
 */

/**
 * 서비스 계정 인증 정보 (환경변수 또는 설정에서 로드)
 */
interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/**
 * 구글 시트 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  newMembers: number;
  updatedMembers: number;
  errors: Array<{
    row: number;
    name?: string;
    error: string;
  }>;
  preview: Array<{
    name: string;
    action: "create" | "update" | "skip";
    data: any;
  }>;
}

/**
 * 구글 시트에서 데이터 읽기 (클라이언트 사이드 - 공개 시트 CSV 다운로드)
 * 
 * 참고: 서버 사이드 Google Sheets API는 Firebase Functions에서 구현 예정
 * 
 * @param spreadsheetId 스프레드시트 ID
 * @param sheetName 시트 이름 (기본값: "members")
 * @returns 파싱된 데이터 배열
 */
export async function readGoogleSheet(
  spreadsheetId: string,
  sheetName: string = "members"
): Promise<any[]> {
  // 🔥 클라이언트 사이드에서는 공개 시트 CSV 다운로드 방식 사용
  // 서버 사이드 Google Sheets API는 Firebase Functions에서 구현 예정
  const { fetchGoogleSheetsAsCSV, parseCSVToObjects } = await import("./googleSheetsTemplate");
  
  try {
    const csvText = await fetchGoogleSheetsAsCSV(spreadsheetId, sheetName);
    return parseCSVToObjects(csvText);
  } catch (error: any) {
    console.error("구글 시트 읽기 실패:", error);
    throw new Error(`구글 시트를 읽을 수 없습니다: ${error.message}`);
  }
}

/**
 * 데이터 검증 및 정규화
 */
export function validateAndNormalizeRow(
  row: any,
  rowIndex: number
): { valid: boolean; data?: any; error?: string } {
  try {
    // 🔥 필수 필드: 이름
    const name = (row["이름"] || row["name"] || "").trim();
    if (!name) {
      return {
        valid: false,
        error: "이름이 없습니다.",
      };
    }
    
    // 🔥 역할 (기본값: "일반")
    let role = (row["역할"] || row["role"] || "일반").trim();
    if (!role) role = "일반";
    
    // 🔥 회비플랜 (기본값: "monthly")
    let feePlanRaw = (row["회비플랜"] || row["feePlan"] || "monthly").trim().toLowerCase();
    let feePlan: "monthly" | "annual" | "exempt" = "monthly";
    if (feePlanRaw === "annual" || feePlanRaw === "연회비") {
      feePlan = "annual";
    } else if (feePlanRaw === "exempt" || feePlanRaw === "면제") {
      feePlan = "exempt";
    }
    
    // 🔥 전화번호 정규화
    let phone = (row["전화번호"] || row["phone"] || "").trim();
    if (phone) {
      // 010-1234-5678 형식으로 정규화
      phone = phone.replace(/[^\d]/g, "");
      if (phone.length === 11 && phone.startsWith("010")) {
        phone = `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
      } else if (phone.length === 10) {
        phone = `010-${phone.slice(0, 4)}-${phone.slice(4)}`;
      }
    }
    
    // 🔥 배번 (숫자로 변환)
    const jerseyNumberStr = (row["배번"] || row["jerseyNumber"] || "").trim();
    const jerseyNumber = jerseyNumberStr ? parseInt(jerseyNumberStr) : undefined;
    
    // 🔥 소속 (청룡/백호만 허용)
    const squadRaw = (row["소속"] || row["squad"] || "").trim();
    const squad = squadRaw === "청룡" || squadRaw === "백호" ? squadRaw : null;
    
    // 🔥 메모
    const memo = (row["메모"] || row["memo"] || "").trim();
    
    return {
      valid: true,
      data: {
        name,
        phone: phone || null,
        jerseyNumber: jerseyNumber && !isNaN(jerseyNumber) ? jerseyNumber : null,
        role,
        feePlan,
        squad,
        memo: memo || null,
        status: "active", // 기본값
      },
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `데이터 처리 오류: ${error.message}`,
    };
  }
}

/**
 * 기존 회원과 비교하여 동기화 액션 결정
 */
export function determineSyncAction(
  sheetData: any,
  existingMembers: Array<{ id: string; name: string; [key: string]: any }>
): "create" | "update" | "skip" {
  const existingMap = new Map<string, string>(); // name -> id
  existingMembers.forEach((m) => {
    if (m.name) {
      existingMap.set(m.name, m.id);
    }
  });
  
  const name = sheetData.name;
  if (existingMap.has(name)) {
    return "update";
  }
  return "create";
}

/**
 * 구글 시트 동기화 (클라이언트 사이드 - Firebase Functions 호출)
 * 
 * @param spreadsheetId 스프레드시트 ID
 * @param teamId 팀 ID
 * @param existingMembers 기존 회원 목록
 * @returns 동기화 결과
 */
export async function syncGoogleSheetToFirestore(
  spreadsheetId: string,
  teamId: string,
  existingMembers: Array<{ id: string; name: string; [key: string]: any }>
): Promise<SyncResult> {
  // 🔥 클라이언트 사이드에서는 Firebase Functions를 통해 호출
  // 또는 공개 시트 CSV 다운로드 방식 사용
  
  // 🔥 임시: 공개 시트 CSV 다운로드 방식 (기존 구현 활용)
  const { fetchGoogleSheetsAsCSV, parseCSVToObjects } = await import("./googleSheetsTemplate");
  
  try {
    const csvText = await fetchGoogleSheetsAsCSV(spreadsheetId);
    const rows = parseCSVToObjects(csvText);
    
    const result: SyncResult = {
      success: true,
      newMembers: 0,
      updatedMembers: 0,
      errors: [],
      preview: [],
    };
    
    // 🔥 각 행 검증 및 액션 결정
    rows.forEach((row, idx) => {
      const validation = validateAndNormalizeRow(row, idx + 2); // +2: 헤더 + 1-based index
      
      if (!validation.valid || !validation.data) {
        result.errors.push({
          row: idx + 2,
          error: validation.error || "알 수 없는 오류",
        });
        return;
      }
      
      const action = determineSyncAction(validation.data, existingMembers);
      result.preview.push({
        name: validation.data.name,
        action,
        data: validation.data,
      });
    });
    
    return result;
  } catch (error: any) {
    return {
      success: false,
      newMembers: 0,
      updatedMembers: 0,
      errors: [
        {
          row: 0,
          error: error.message || "알 수 없는 오류",
        },
      ],
      preview: [],
    };
  }
}

