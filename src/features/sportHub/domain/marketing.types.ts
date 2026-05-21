/**
 * 🔥 Marketing Types - 마케팅 자동화 도메인 모델
 * 
 * 사람 손 개입 없이 재방문·예약 유도
 */

import type { Region } from "./region.types";
import type { StoryCategory } from "./story.types";

/**
 * 캠페인 트리거
 */
export type CampaignTrigger =
  | "league_soon"      // 대회 임박
  | "team_recruit"     // 팀 모집
  | "ground_discount"  // 구장 할인
  | "inactive"         // 장기 미접속
  | "match_reminder"   // 경기 리마인드
  | "reservation_confirm"; // 예약 확인

/**
 * 채널
 */
export type MarketingChannel = "push" | "kakao" | "sms" | "in_app";

/**
 * 세그먼트
 */
export type MarketingSegment = {
  region?: Region;
  category?: StoryCategory[];
  level?: "beginner" | "normal" | "pro";
  interests?: string[];
  lastActiveDays?: number; // 마지막 접속일
};

/**
 * 캠페인
 */
export type Campaign = {
  id: string;
  region: Region;
  
  trigger: CampaignTrigger;
  segment: MarketingSegment;
  
  // AB 테스트
  abKey: string;
  messageA: string;
  messageB: string;
  
  // 채널
  channels: MarketingChannel[];
  
  // 설정
  enabled: boolean;
  priority: number; // 0-100
  
  // 빈도 제한
  maxPerDay: number;
  minIntervalHours: number;
  
  // 시간 제한
  sendTimeStart?: string; // "09:00"
  sendTimeEnd?: string;   // "22:00"
  
  createdAt: string;
  updatedAt: string;
};

/**
 * 발송 로그
 */
export type CampaignSendLog = {
  id: string;
  campaignId: string;
  userId: string;
  channel: MarketingChannel;
  message: string;
  variant: "A" | "B";
  sentAt: string;
  clickedAt?: string;
  convertedAt?: string;
};

/**
 * 사용자 발송 이력
 */
export type UserSendHistory = {
  userId: string;
  lastSentAt: Record<CampaignTrigger, string | null>;
  sentCountToday: number;
  channelsUsedToday: Set<MarketingChannel>;
};
