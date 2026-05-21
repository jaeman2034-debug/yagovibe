/**
 * 🔥 Event (행사) 타입 정의
 * 
 * 역할: 생활체육 플랫폼의 핵심 엔티티
 * 경로: events/{eventId}
 */

import { Timestamp } from "firebase/firestore";

/**
 * Event Type
 */
export type EventType =
  | "ceremony"      // 시무식, 종무식
  | "tournament"    // 토너먼트 (협회장기, 구청장기, 스폰서컵)
  | "league"        // 리그 (K7 등)
  | "academy"       // 유소년 아카데미
  | "festival";      // 축제

/**
 * Event Status
 */
export type EventStatus =
  | "draft"                  // 초안
  | "registration_open"      // 참가 신청 중
  | "registration_closed"    // 참가 신청 마감
  | "scheduled"              // 일정 확정
  | "ongoing"                // 진행 중
  | "completed"              // 완료
  | "canceled";              // 취소

/**
 * Event (행사)
 * 
 * 경로: events/{eventId}
 */
export interface Event {
  id: string;
  
  // 기본 정보
  name: string;                    // "노원구 협회장기 축구대회"
  type: EventType;                 // "tournament" | "league" | "ceremony" | "academy" | "festival"
  sportType: string;               // "football" | "futsal"
  
  // 지역/시즌
  regionCode: string;              // "KR_SEOUL_NOWON"
  seasonId: string;                 // "2026"
  
  // 주최/주관
  organizationId?: string;          // 운영 기관 ID
  organizerName: string;            // "노원구축구협회"
  sponsorName?: string | null;      // 스폰서 (선택적)
  
  // 일정
  startDate: Timestamp;
  endDate: Timestamp;
  
  // 상태
  status: EventStatus;
  
  // 설명
  description?: string;
  shortName?: string;               // "협회장기"
  slug?: string;                    // "2026-nowon-association-cup"
  venueSummary?: string;            // "노원구민체육센터 외"
  posterImageUrl?: string | null;
  isPublic?: boolean;
  
  // 우승/준우승 (토너먼트 완료 시 자동 생성)
  champion?: {
    teamId: string;
    teamName: string;
    matchId: string;              // 결승 경기 ID
    decidedAt: Timestamp;
  } | null;
  runnerUp?: {
    teamId: string;
    teamName: string;
    matchId: string;              // 결승 경기 ID
    decidedAt: Timestamp;
  } | null;

  // 메타데이터
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Event Division (행사 부문)
 * 
 * 경로: event_divisions/{divisionId}
 */
export interface EventDivision {
  id: string;
  eventId: string;
  seasonId: string;

  name: string;                    // "일반부", "U12"
  code: string;                    // "GENERAL", "U12"
  gender: "male" | "female" | "mixed";
  ageRule: {
    min?: number;
    max?: number | null;
    minBirthYear?: number;
    maxBirthYear?: number;
  };

  formatType: "knockout" | "group" | "league" | "hybrid" | "group_knockout";
  maxTeams?: number;

  status: "active" | "inactive";
  sortOrder: number;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Event Entry (행사 참가 신청)
 * 
 * 경로: event_entries/{entryId}
 * 
 * 기존 event_teams보다 서비스적으로는 entry 개념이 더 좋습니다.
 * 단순 참가팀이 아니라 참가 신청 + 승인 + 시드 + 상태를 담을 수 있기 때문입니다.
 */
export interface EventEntry {
  id: string;                      // {eventId}_{teamId}
  eventId: string;
  divisionId: string;
  seasonId: string;

  teamId: string;
  teamName: string;                // denormalized

  applicationStatus: "pending" | "approved" | "rejected" | "withdrawn";
  participationStatus: "active" | "eliminated" | "completed";

  seed?: number | null;
  groupCode?: string | null;       // "A" | "B" | null

  appliedAt: Timestamp;
  approvedAt?: Timestamp | null;

  managerUserId: string;
  note?: string | null;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Event Match (행사 경기)
 * 
 * 경로: event_matches/{matchId}
 */
export interface EventMatch {
  id: string;
  seasonId: string;
  eventId: string;
  divisionId: string;

  // 경기 정보
  stageType: "group" | "knockout" | "league";
  roundCode: string;               // "R16" | "QF" | "SF" | "F"
  roundName: string;               // "16강" | "8강" | "4강" | "결승"

  bracketSlot?: number;
  matchNumber?: number;

  // 참가 신청 정보
  homeEntryId: string;
  awayEntryId: string;

  // 팀 정보
  homeTeamId: string;
  homeTeamName: string;            // denormalized
  awayTeamId: string;
  awayTeamName: string;            // denormalized

  // 일정/장소
  scheduledAt: Timestamp;
  venueId?: string;
  venueName?: string;
  venueAddress?: string;

  // 결과
  status: "scheduled" | "live" | "completed" | "canceled" | "postponed";
  score?: {
    home: number;
    away: number;
  };
  homeScore?: number; // 호환성 유지
  awayScore?: number; // 호환성 유지
  winnerTeamId?: string | null;

  isPenaltyShootout?: boolean;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;

  reportStatus?: "draft" | "submitted" | "confirmed";
  confirmedAt?: Timestamp;

  // 선수 기록 입력 완료 플래그
  statsCompleted?: boolean;
  statsCompletedAt?: Timestamp;

  // 브래킷 연결 (토너먼트)
  nextMatchId?: string | null;
  homeSourceMatchId?: string | null;
  awaySourceMatchId?: string | null;

  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Event Schedule (행사 일정)
 * 
 * 경로: event_schedules/{scheduleId}
 */
export interface EventSchedule {
  id: string;                      // {eventId}_{date}
  eventId: string;
  divisionId?: string;

  // 일정
  date: Timestamp;                 // 날짜 (시간 제외)
  venueId?: string;
  venueName: string;
  venueAddress?: string;

  // 경기 목록
  matchIds: string[];              // event_matches ID 목록

  // 상태
  status?: "draft" | "published";

  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Ranking (순위)
 * 
 * 경로: rankings/{rankingId}
 */
export interface Ranking {
  id: string;
  scope: "season" | "event" | "division" | "team";
  seasonId: string;
  eventId?: string;
  divisionId?: string;

  teamId: string;
  teamName: string;

  played: number;
  won: number;
  drawn: number;
  lost: number;

  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;

  rank: number;
  updatedAt: Timestamp;
}

/**
 * Award (시상)
 * 
 * 경로: awards/{awardId}
 */
export interface Award {
  id: string;
  seasonId: string;
  eventId: string;
  divisionId: string;

  awardType: "champion" | "runner_up" | "top_scorer" | "mvp" | "fair_play";
  targetType: "team" | "player";
  targetId: string;
  targetName: string;

  createdAt: Timestamp;
}

/**
 * Event Award (행사 시상)
 * 
 * 경로: event_awards/{awardId}
 * 
 * 결승전 완료 시 자동 생성되는 Champion/Runner-up 기록
 */
export interface EventAward {
  id: string;
  eventId: string;
  divisionId?: string;

  awardType: "champion" | "runner_up";
  teamId: string;
  teamName?: string;              // denormalized

  matchId?: string;               // 결승 경기 ID
  createdAt: Timestamp;
}
