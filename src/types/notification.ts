/**
 * 🔥 알림 & 활동 로그 타입 정의 (STEP: 알림 히스토리 & 활동 로그)
 * 
 * 핵심 원칙:
 * - Notification: 지금 알려야 할 것 (짧고 즉각적, 읽으면 끝)
 * - ActivityLog: 나중에 다시 볼 수 있는 기록 (절대 삭제 ❌, 개인 커리어의 재료)
 * - 한 이벤트 → 알림 1개 + 로그 1개
 */

/**
 * 알림 타입
 */
export type NotificationType =
  // 기존 (팀/협회)
  | "TEAM_JOIN_APPROVED"
  | "TEAM_JOIN_REJECTED"
  | "TEAM_CAPTAIN_DELEGATED" // 팀장 위임됨
  | "TEAM_MEMBER_REMOVED" // 팀에서 추방됨
  | "ASSOCIATION_JOINED" // 협회 가입 완료
  | "TOURNAMENT_APPLIED"
  | "TOURNAMENT_APPROVED"
  | "TOURNAMENT_REJECTED"
  | "RESULT_RECORDED"
  | "TEAM_DISBANDED"
  | "TEAM_LEFT"
  | "TOURNAMENT_RESULT_RECORDED"
  | "TEAM_WALL_POST" // 팀 타임라인(팀 전용 activities) 새 글
  // 🔥 신규: 일정 도메인
  | "TEAM_SCHEDULE_CREATED"      // 일정 생성
  | "TEAM_SCHEDULE_UPDATED"      // 일정 변경
  | "TEAM_SCHEDULE_REMINDER"     // 일정 리마인드 (D-1, D-0)
  // 🔥 신규: 채팅 도메인
  | "CHAT_MESSAGE"              // 새 메시지
  | "CHAT_LOCATION_SHARED"      // 위치 공유
  | "CHAT_VOICE_SUMMARY"        // 음성 요약 완료
  // 🔥 신규: 거래 도메인 (당근급)
  | "PRICE_OFFER"               // 가격 제안
  | "TRADE_RESERVED"             // 예약됨
  | "TRADE_COMPLETED"            // 거래완료
  | "TRADE_CANCELLED"            // 거래취소
  // 🔥 마켓 알림 v1
  | "MARKET_CHAT_MESSAGE"        // 채팅 메시지 수신
  | "MARKET_TRANSACTION_COMPLETE" // 거래 완료 요청
  | "MARKET_POST_UPDATED"        // 찜한 글 업데이트
  | "MARKET_POST_LIKED"          // 내 글에 찜하기
  // 🔥 신규: 매칭 참여 도메인
  | "MARKET_JOIN_APPROVED"       // 매칭 참여 승인
  | "MARKET_JOIN_REJECTED"       // 매칭 참여 거절
  | "MARKET_JOIN_CANCELLED"      // 매칭 참여 취소
  | "MARKET_WAITLIST_PROMOTED"   // 대기열 → 참여 확정 (자동 승격)
  // 🔥 신규: 모집 단체방 알림
  | "RECRUIT_NEW_MEMBER"         // 새 멤버 입장
  | "RECRUIT_KICKED"              // 강퇴됨
  | "RECRUIT_CLOSED"              // 모집 마감
  | "SYSTEM_NOTICE"               // 시스템 공지
  // 🔥 스포츠 플랫폼 알림
  | "MATCH_RESULT_UPDATED"        // 경기 결과 업데이트
  | "MATCH_STARTED"               // 경기 시작
  | "MATCH_COMPLETED"             // 경기 완료
  | "PLAYER_STATS_UPDATED"        // 선수 기록 업데이트
  | "LEADERBOARD_RANK_CHANGED"    // 리더보드 순위 변화
  | "EVENT_STARTED"               // 대회 시작
  | "EVENT_COMPLETED"             // 대회 완료
  | "AWARD_ANNOUNCED"             // 수상 발표
  | "TEAM_MATCH_SCHEDULED"        // 팀 경기 일정
  | "TEAM_MATCH_REMINDER"         // 경기 리마인더
  | "MATCH_JOIN_REQUESTED"       // 팀 매칭글에 타 팀이 참여 신청
  | "MATCH_JOIN_ACCEPTED"        // 내 매칭 신청이 호스트에 의해 승인·확정
  | "MATCH_JOIN_REJECTED"        // 내 매칭 신청 거절 또는 타 팀 확정으로 마감
  | "PLAYER_ACHIEVEMENT"          // 선수 기록 달성
  | "TEAM_RANKING_UPDATED"        // 팀 순위 업데이트
  // 🔥 Social Features 알림
  | "LIKE_RECEIVED"                // 좋아요 받음
  | "COMMENT_RECEIVED"             // 댓글 받음
  | "COMMENT_REPLY"                // 대댓글 받음
  | "FOLLOW_RECEIVED"              // 팔로우 받음
  | "SHARE_RECEIVED"              // 공유 받음
  | "fee_reminder"                // 팀 회비 독촉·일괄 알림 (Firestore 소문자)
  | "billing_re_register_request"; // 자동결제 실패 → 카드 재등록 안내

/** 푸시/인박스 A/B 실험 식별자 (Firestore 문자열) */
export type NotificationExperimentId = "billing_reregister_v1" | "fee_reminder_v1";

/**
 * 알림
 * 경로: notifications/{id}
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;

  /** 채팅 알림 등 — 방 입장 시 미읽음 일괄 처리용 (선택) */
  relatedChatId?: string;

  /** 알림 클릭 시 스크롤/하이라이트할 메시지 (선택, `payload.messageId`와 중복 가능) */
  relatedMessageId?: string;

  /** 알림을 유발한 주체(작성자·호스트·신청자 등) — 조인 없이 표시용 denormalize */
  actorId?: string;
  actorName?: string;
  actorPhotoUrl?: string;
  teamId?: string;
  teamName?: string;

  /** 회비·정산 등 — payments.orderId / cashBook 추적과 동일 키(예: manual_fee_{feeId}_{uid}) */
  correlationId?: string;
  
  // 🔥 딥링크 구조 (우선)
  target?: {
    screen: 'chat' | 'item' | 'market' | 'trade' | 'profile' | 'team' | 'tournament' | 'home' | 'match' | 'event' | 'player' | 'leaderboard';
    id?: string; // chatRoomId, productId, tradeId, matchId, eventId 등
    params?: Record<string, string>; // 추가 파라미터
  };
  
  // 🔥 우선순위
  priority?: 'high' | 'normal' | 'low';
  
  // 하위 호환성 (deprecated, target 사용 권장)
  link?: string; // 클릭 시 이동
  
  isRead: boolean;
  createdAt: any; // Timestamp
  /** UI·정렬 보조 (serverTimestamp 반영 전) */
  createdAtMillis?: number;

  /** 푸시/인박스 수신(포그라운드 등) — 최초 1회만 기록 권장 */
  openedAt?: any;
  /** 알림에서 실제 이동(딥링크) 발생 — 최초 1회만 기록 권장 */
  clickedAt?: any;

  /** A/B 실험 (문구·퍼널 집계용) */
  experiment?: NotificationExperimentId;
  variant?: "A" | "B";

  // 🔥 페이로드 (타입별 추가 데이터)
  payload?: {
    chatRoomId?: string;
    productId?: string;
    tradeId?: string;
    senderId?: string;
    [key: string]: any;
  };
}

/**
 * 활동 로그 카테고리
 */
export type ActivityLogCategory = "TEAM" | "TOURNAMENT" | "RESULT";

/**
 * 활동 로그
 * 경로: activityLogs/{id}
 */
export interface ActivityLog {
  id: string;
  userId: string;
  category: ActivityLogCategory;
  action: string; // 'JOINED_TEAM', 'LEFT_TEAM', 'PLACED_3RD' 등
  context: {
    teamId?: string;
    tournamentId?: string;
    seasonId?: string;
    [key: string]: any; // 확장 가능
  };
  createdAt: any; // Timestamp
}
