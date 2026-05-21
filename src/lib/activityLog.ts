/**
 * 🔥 플랫폼 활동 로그 시스템
 * 
 * 목적: 관리자가 "오늘 야고가 실제로 살아있는지" 한눈에 확인
 * 
 * CTR과 완전히 분리된 레이어:
 * - CTR: 콘텐츠 반응 지표 (story_impression, story_click)
 * - ActivityLog: 플랫폼 생존 지표 (페이지뷰, 기능 사용, 팀 활동 등)
 */

// 활동 로그 이벤트 타입 정의
export type ActivityEvent =
  // 기본 활동
  | "PAGE_VIEW"           // 페이지 진입
  | "SPORT_SELECTED"      // 종목 선택
  | "SEARCH"              // 검색 실행
  | "PROFILE_VIEW"        // 마이페이지 조회
  
  // 핵심 행동
  | "TEAM_CREATE_CLICK"   // 팀 만들기 버튼 클릭
  | "TEAM_JOIN"           // 팀 가입 완료
  | "TEAM_VIEW"           // 팀 상세 조회
  | "MARKET_VIEW"         // 마켓 조회
  | "MARKET_ITEM_CLICK"   // 마켓 상품 클릭
  | "CHAT_OPEN"           // 채팅 진입
  | "SCHEDULE_VIEW"       // 일정 조회
  | "FACILITY_VIEW"       // 구장 조회
  | "NOTI_CLICK"          // 알림 클릭
  
  // 기타
  | "FEATURE_CLICK"       // 기능 버튼 클릭
  | "NAVIGATION"          // 네비게이션 이동
  | "SHARE"               // 공유하기
  | "FAVORITE_ADD"        // 즐겨찾기 추가
  | "FAVORITE_REMOVE";    // 즐겨찾기 제거

export interface ActivityLogPayload {
  event: ActivityEvent;
  location?: string;      // 현재 경로 (예: "/sports/football")
  meta?: Record<string, any>; // 추가 메타데이터
  userId?: string;        // 사용자 ID (선택)
  sessionId?: string;     // 세션 ID (선택)
}

// ====== 오프라인 큐 ======
const QUEUE_KEY = "activity_queue";

function queueActivity(payload: ActivityLogPayload & { at: string; path: string }): void {
  try {
    const prev = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    prev.push(payload);
    
    // 최대 100개까지만 보관 (용량 제한)
    const trimmed = prev.slice(-100);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("[ActivityLog] 큐 저장 실패:", error);
  }
}

function getQueue(): (ActivityLogPayload & { at: string; path: string })[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // 무시
  }
}

/**
 * 플랫폼 활동 로그 기록
 * 
 * @param payload - 활동 로그 데이터
 */
export async function logActivity(payload: ActivityLogPayload): Promise<void> {
  try {
    const logData = {
      ...payload,
      at: new Date().toISOString(),
      path: payload.location || (typeof window !== "undefined" ? window.location.pathname : null),
    };

    // 개발 환경에서만 콘솔 로그
    if (import.meta.env.DEV) {
      console.log("🟣 [ACTIVITY]", logData);
    }

    // 오프라인 큐에 저장
    queueActivity(logData);

    // 온라인 시 즉시 전송
    if (typeof window !== "undefined" && navigator.onLine) {
      flushActivity();
    }
  } catch (error) {
    // 로그 실패해도 앱은 계속 작동
    console.warn("[ActivityLog] 로깅 실패:", error);
  }
}

/**
 * 활동 로그 큐 전송 (온라인 시)
 */
export async function flushActivity(): Promise<void> {
  if (typeof window === "undefined") return;
  
  // 🔥 개발 환경에서는 Activity 로그 서버 없으므로 무시
  if (import.meta.env.DEV) return;

  const queue = getQueue();
  if (!queue.length) return;

  const API_BASE = import.meta.env.VITE_API_BASE || "/api";
  // 🔥 프로덕션에서 localhost 호출 방지 (ERR_CONNECTION_REFUSED 방지)
  if (typeof API_BASE === "string" && API_BASE.includes("localhost")) return;

  try {
    const url = `${API_BASE}/logs/activity/bulk`;

    // 🔥 네트워크 에러는 조용히 무시 (페이지 로딩에 영향 없음)
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queue),
      // 🔥 타임아웃 설정 (5초)
      signal: AbortSignal.timeout(5000),
    }).catch(() => {
      // 네트워크 에러는 조용히 무시 (서버가 꺼져있거나 CORS 실패)
      return null;
    });

    if (!res) return; // 네트워크 에러로 null 반환된 경우

    if (res.ok) {
      const result = await res.json();
      console.log(`🟢 [ACTIVITY] ${result.count || queue.length}개 전송 완료`);
      clearQueue();
    }
    // 🔥 서버 에러는 무시 (activity log 서버 없음)
  } catch {
    // 🔥 모든 에러 무시 (activity log 서버 없음)
  }
}

/**
 * 페이지뷰 로깅 헬퍼
 */
export function logPageView(path: string, meta?: Record<string, any>): void {
  logActivity({
    event: "PAGE_VIEW",
    location: path,
    meta,
  });
}

/**
 * 종목 선택 로깅 헬퍼
 */
export function logSportSelected(sportType: string, meta?: Record<string, any>): void {
  logActivity({
    event: "SPORT_SELECTED",
    location: `/sports/${sportType}`,
    meta: { sportType, ...meta },
  });
}

/**
 * 팀 가입 로깅 헬퍼
 */
export function logTeamJoin(teamId: string, teamName?: string): void {
  logActivity({
    event: "TEAM_JOIN",
    location: `/team/${teamId}`,
    meta: { teamId, teamName },
  });
}

/**
 * 검색 로깅 헬퍼
 */
export function logSearch(query: string, resultCount?: number): void {
  logActivity({
    event: "SEARCH",
    location: "/search",
    meta: { query, resultCount },
  });
}
