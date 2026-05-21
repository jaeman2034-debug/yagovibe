// src/lib/analytics.ts
// 🔥 Analytics 이벤트 추적 (단일 진실 소스)
// ⚠️ Lazy init으로 순환 참조 방지

import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { getApps } from "firebase/app";

// Analytics 인스턴스 타입 (getAnalytics 반환 타입 사용)
type AnalyticsInstance = ReturnType<typeof getAnalytics>;

// Analytics 인스턴스 (lazy 초기화)
let analytics: AnalyticsInstance | null = null;
let analyticsInitialized = false;
let analyticsInitPromise: Promise<AnalyticsInstance | null> | null = null;

/**
 * Analytics 초기화 (완전 lazy, async)
 */
async function initAnalytics(): Promise<AnalyticsInstance | null> {
  if (analyticsInitialized) {
    return analytics;
  }

  // 이미 초기화 중이면 기다림
  if (analyticsInitPromise) {
    return analyticsInitPromise;
  }

  analyticsInitPromise = (async () => {
    try {
      // window 체크
      if (typeof window === "undefined") {
        return null;
      }

      // Firebase 앱이 초기화되었는지 확인
      if (getApps().length === 0) {
        return null;
      }

      // Analytics 지원 여부 확인
      const supported = await isSupported();
      if (!supported) {
        return null;
      }

      // 동적 import로 firebase.ts 로드 (순환 참조 방지)
      const { app } = await import("./firebase");
      analytics = getAnalytics(app);
      analyticsInitialized = true;
      return analytics;
    } catch (error) {
      console.warn("Analytics 초기화 실패:", error);
      analyticsInitialized = true; // 실패해도 재시도 방지
      return null;
    }
  })();

  return analyticsInitPromise;
}

/**
 * Analytics 이벤트 추적 (단일 진실 소스)
 * ⚠️ 비동기로 변경하여 순환 참조 방지
 */
export const track = async (
  event: string,
  params?: Record<string, any>
): Promise<void> => {
  // 개발 환경에서는 기본 무음. 필요 시 localStorage로 수동 활성화.
  if (import.meta.env.DEV) {
    const debugEnabled =
      typeof window !== "undefined" && window.localStorage.getItem("debug:analytics") === "1";
    if (debugEnabled) {
      console.log("[Analytics]", event, params);
    }
    return;
  }

  try {
    // Analytics 초기화 (async)
    const analyticsInstance = await initAnalytics();

    // Firebase Analytics에 전송
    if (analyticsInstance) {
      try {
        logEvent(analyticsInstance, event, params);
      } catch (error) {
        console.warn("Analytics 이벤트 전송 실패:", error);
      }
    }
  } catch (error) {
    // 초기화 실패해도 무시 (UX 영향 없음)
    console.warn("Analytics 추적 실패:", error);
  }
};

/**
 * 팀 블로그 랜딩 페이지 이벤트 추적 (퍼널 분석용)
 */
export const trackTeamBlog = {
  // 페이지 방문
  view: (params: {
    teamId: string;
    teamSlug: string;
    teamName: string;
    userRole: 'guest' | 'member' | 'pending' | 'admin';
    source?: 'direct' | 'search' | 'share' | 'referral';
    plan?: 'free' | 'pro';
  }) => {
    track('team_blog_view', params);
  },

  // CTA 노출
  ctaImpression: (params: {
    teamId: string;
    teamSlug: string;
    ctaLocation: 'hero' | 'conversion1' | 'conversion2' | 'sticky';
    ctaText: string;
    userRole: 'guest' | 'member' | 'pending' | 'admin';
    scrollPercent: number;
  }) => {
    track('team_blog_cta_impression', params);
  },

  // CTA 클릭
  ctaClick: (params: {
    teamId: string;
    teamSlug: string;
    ctaLocation: 'hero' | 'conversion1' | 'conversion2' | 'sticky';
    ctaText: string;
    userRole: 'guest' | 'member' | 'pending' | 'admin';
    scrollPercent: number;
    timeOnPage: number;
  }) => {
    track('team_blog_cta_click', params);
  },

  // 가입 요청
  joinRequest: (params: {
    teamId: string;
    teamSlug: string;
    requestId: string;
    hasMessage: boolean;
    messageLength?: number;
    ctaLocation: 'hero' | 'conversion1' | 'conversion2' | 'sticky';
    timeOnPage: number;
    scrollPercent: number;
  }) => {
    track('team_blog_join_request', params);
  },

  // 중복 가입 요청
  joinRequestDuplicate: (params: {
    teamId: string;
    teamSlug: string;
    requestId: string;
    ctaLocation: string;
  }) => {
    track('team_blog_join_request_duplicate', params);
  },

  // Pro 트리거 노출
  proTriggerImpression: (params: {
    teamId: string;
    teamSlug: string;
    triggerType: 'first_post' | 'views_increase' | 'second_post_attempt' | 'join_requests_increase' | 'dashboard_entry';
    views?: number;
    clicks?: number;
    joinRequests?: number;
    plan: 'free' | 'pro';
  }) => {
    track('team_blog_pro_trigger_impression', params);
  },

  // Pro 업그레이드 클릭
  proUpgradeClick: (params: {
    teamId: string;
    teamSlug: string;
    triggerType: string;
    views?: number;
    clicks?: number;
    joinRequests?: number;
    plan: 'free';
  }) => {
    track('team_blog_pro_upgrade_click', params);
  },
};

/**
 * 공개 팀 블로그 랜딩 페이지 이벤트 추적 (GA4/Amplitude 공용)
 */
export const trackTeamBlogLanding = {
  // Page View & 진입 품질
  pageView: (params: {
    teamId: string;
    teamSlug: string;
    hasRecentActivity: boolean;
    hasBlogPosts: boolean;
    entrySource: 'direct' | 'share' | 'search';
    userState: 'guest' | 'member' | 'pending' | 'admin';
    device: 'mobile' | 'web';
  }) => {
    track('page_view_team_blog', {
      ...params,
      page: 'team_public_blog',
    });
  },

  // Hero 영역 핵심 행동
  clickPrimaryCTA: (params: {
    teamId: string;
    teamSlug: string;
    ctaText: string;
    ctaPosition: 'hero' | 'conversion_1' | 'conversion_2';
    userState: 'guest' | 'member' | 'pending' | 'admin';
    device: 'mobile' | 'web';
  }) => {
    track('click_primary_cta', {
      ...params,
      page: 'team_public_blog',
    });
  },

  clickSecondaryCTA: (params: {
    teamId: string;
    teamSlug: string;
    ctaText: string;
    userState: 'guest' | 'member' | 'pending' | 'admin';
    device: 'mobile' | 'web';
  }) => {
    track('click_secondary_cta', {
      ...params,
      page: 'team_public_blog',
    });
  },

  // 전환 구간 1 (가입 의도)
  clickJoinTeam: (params: {
    teamId: string;
    teamSlug: string;
    fromSection: 'conversion_1';
    userState: 'guest';
    device: 'mobile' | 'web';
  }) => {
    track('click_join_team', {
      ...params,
      page: 'team_public_blog',
    });
  },

  // 콘텐츠 영역
  viewBlogPreview: (params: {
    teamId: string;
    teamSlug: string;
    postCount: number;
    userState: 'guest' | 'member' | 'pending' | 'admin';
    device: 'mobile' | 'web';
  }) => {
    track('view_blog_preview', {
      ...params,
      page: 'team_public_blog',
    });
  },

  clickBlogPost: (params: {
    teamId: string;
    teamSlug: string;
    postTitle: string;
    postIndex: 1 | 2 | 3;
    userState: 'guest' | 'member' | 'pending' | 'admin';
    device: 'mobile' | 'web';
  }) => {
    track('click_blog_post', {
      ...params,
      page: 'team_public_blog',
    });
  },

  // 전환 구간 2 (강화 CTA)
  clickTryActivity: (params: {
    teamId: string;
    teamSlug: string;
    ctaPosition: 'conversion_2';
    userState: 'guest' | 'member' | 'pending' | 'admin';
    device: 'mobile' | 'web';
  }) => {
    track('click_try_activity', {
      ...params,
      page: 'team_public_blog',
    });
  },

  // 관리자 전용 수익 트리거
  viewAdminProNotice: (params: {
    teamId: string;
    teamSlug: string;
    last7dVisitors: number;
    device: 'mobile' | 'web';
  }) => {
    track('view_admin_pro_notice', {
      ...params,
      page: 'team_public_blog',
      userState: 'admin',
    });
  },

  clickProUpgrade: (params: {
    teamId: string;
    teamSlug: string;
    plan: 'pro';
    from: 'admin_notice';
    last7dVisitors?: number;
    device: 'mobile' | 'web';
  }) => {
    track('click_pro_upgrade', {
      ...params,
      page: 'team_public_blog',
      userState: 'admin',
    });
  },
};

/**
 * 🔥 SMS 인증 이벤트 추적 (퍼널 분석용)
 * ⚠️ 전화번호는 절대 GA에 보내지 마라 (PII → 계정 정지 가능)
 */
export const trackSMS = {
  // SMS 요청
  request: (params?: {
    platform?: 'mobile' | 'web';
    countryCode?: string; // 국가 코드만 (예: "+82")
  }) => {
    track('phone_sms_request', params);
  },

  // SMS 전송 성공
  success: (params?: {
    platform?: 'mobile' | 'web';
    countryCode?: string;
  }) => {
    track('phone_sms_success', params);
  },

  // 인증 성공
  verifySuccess: (params?: {
    platform?: 'mobile' | 'web';
  }) => {
    track('phone_verify_success', params);
  },
};

/**
 * 🔥 온보딩 이벤트 추적 (퍼널 분석용)
 * ⚠️ variant 필수: A/B 실험 결과 분석용
 */
export const trackOnboarding = {
  // 온보딩 단계 진입
  step: (params: {
    step: number; // 0부터 시작
    stepName?: string; // 'name' | 'purpose' | 'sport' | 'region' | 'done'
    variant?: "A" | "B"; // 🔥 A/B 실험군 (필수)
  }) => {
    track('onboarding_step', params);
  },

  // 온보딩 완료
  complete: (params?: {
    totalSteps?: number;
    timeSpent?: number; // 초 단위 (선택)
    variant?: "A" | "B"; // 🔥 A/B 실험군 (필수)
  }) => {
    track('onboarding_complete', params);
  },
};

/**
 * 🔥 마켓 이벤트 추적 (v1)
 * 핵심 사용자 행동 데이터 수집
 */
export const trackMarket = {
  // 게시글 상세 진입
  viewPost: (params: {
    postId: string;
    sport?: string;
    category?: string;
    price?: number;
  }) => {
    track('view_post', params);
  },

  // 채팅 시작
  clickChat: (params: {
    postId: string;
    sellerId: string;
    price?: number;
  }) => {
    track('click_chat', params);
  },

  // 좋아요 클릭 (토글)
  toggleLike: (params: {
    postId: string;
    isLiked: boolean; // 클릭 후 상태
  }) => {
    track('toggle_like', params);
  },

  // 검색 실행
  search: (params: {
    keyword: string;
    resultCount: number;
    source?: 'search_bar' | 'ai_search' | 'semantic_search';
  }) => {
    track('search', params);
  },

  // 거래 완료
  completeTransaction: (params: {
    postId: string;
    price?: number;
    sellerId: string;
  }) => {
    track('complete_transaction', params);
  },

  // 리뷰 작성
  writeReview: (params: {
    postId: string;
    rating: number; // 1~5
    sellerId: string;
    hasComment: boolean;
  }) => {
    track('write_review', params);
  },
};

/**
 * 마켓 지도(/market/map) 행동 로그 — Firebase Analytics `track` 경유
 * 이벤트명·파라미터 키는 KPI 정의와 맞출 것
 */
export const trackMarketMap = {
  mapMove: (params: {
    bounds_key: string;
    bounds_north: number;
    bounds_south: number;
    bounds_east: number;
    bounds_west: number;
    zoom: number;
  }) => {
    void track('map_move', params);
  },

  mapSearchClick: (params: {
    source: 'region_cta' | 'fab_refresh';
    loaded_preview?: number;
    last_fetch_count?: number;
  }) => {
    void track('map_search_click', params);
  },

  markerClick: (params: { product_id: string; lat?: number; lng?: number }) => {
    void track('marker_click', params);
  },

  switchToList: (params?: { has_bounds: boolean; service_type?: string }) => {
    void track('switch_to_list', params ?? {});
  },

  switchToMap: (params?: { has_bounds: boolean; from_view?: string }) => {
    void track('switch_to_map', params ?? {});
  },

  productClick: (params: {
    product_id: string;
    source: 'map_sheet' | 'map_marker' | 'map_cluster_sheet';
  }) => {
    void track('product_click', params);
  },

  /** 클러스터(숫자 원) 탭 → 목록 시트 오픈 */
  clusterSheetOpen: (params: { count: number }) => {
    void track('map_cluster_sheet_open', params);
  },

  emptyStateExposed: (params: {
    variant: 'no_data_in_view' | 'radius_filter' | 'fetch_error';
    service_type?: string;
  }) => {
    void track('empty_state_exposed', params);
  },

  /** 뷰포트(위·경도 슬라이스) 조회 직후 결과 건수 — 데이터 밀도 vs UX 이탈 분석용 */
  mapResultCount: (params: {
    count: number;
    service_type: string;
    bounds_key: string;
  }) => {
    void track('map_result_count', params);
  },
};

/** 팀 플레이(/play) 퍼널 — Firebase Analytics 이벤트명 고정 (GA4 대시보드 필터용) */
export type TeamPlayAnalyticsEventName =
  | "GAME_CREATED"
  | "PLAY_PAGE_VIEW"
  | "JUST_CREATED_BANNER_SHOWN"
  | "CTA_CLICK_RESULT"
  | "CTA_CLICK_PARTICIPATION"
  | "VIEW_SIMULATION"
  | "VIEW_GROWTH"
  | "FEEDBACK_SUBMIT"
  | "LEVEL_UP"
  | "MINI_SHOT_PLAY"
  | "MINI_SHOT_RESULT"
  | "MINI_SHOT_SESSION_END"
  | "MINI_SHOT_SESSION_RETRY";

/**
 * 팀 플레이 행동 로그 (프로덕션에서만 전송 · 개발은 `localStorage.debug:analytics=1` 시 콘솔)
 * @see `track` — 파라미터는 GA4 권장 snake_case
 */
export function TRACK(name: TeamPlayAnalyticsEventName, params?: Record<string, string | number | boolean>): void {
  void track(name, params ?? {});
}
