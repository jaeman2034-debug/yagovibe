/**
 * 🔥 Match (팀 경기 매칭) 타입 정의
 */

import { Timestamp } from "firebase/firestore";
import type { SportType } from "./sport";

/** 매칭 글 팀 수준 (레거시 값은 기존 문서 호환용) */
export type MatchLevel =
  | "초보"
  | "중급"
  | "고급"
  | "상관없음"
  | "취미"
  | "아마추어";

/** 연락 방법 (레거시 "채팅"은 기존 문서 호환용) */
export type MatchContactMethod = "카카오톡" | "전화" | "문자" | "채팅";

export interface Match {
  id: string;
  teamId: string;
  teamName: string;
  authorId: string;
  opponentTeamId?: string;
  opponentTeamName?: string;
  
  sport: SportType; // 🔥 필수 필드: 멀티 스포츠 지원
  date: Timestamp;
  time: string;
  /** 경기 지역 (신규 canonical) */
  matchRegion?: string;
  /** 레거시 필드 (하위 호환) */
  region: string;
  stadium?: string;
  /** 구장 핀 (지도에서 선택 시) */
  stadiumLat?: number;
  stadiumLng?: number;
  level: MatchLevel;
  fee?: number;
  contact: MatchContactMethod;
  /** 카카오톡 ID / 전화번호 등 연락 상세 */
  contactDetail?: string;
  description?: string;
  
  status: "open" | "matched" | "finished";
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface MatchRequest {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  /** 신청을 보낸 팀 관리자(로그인 유저) — 승인/거절 알림 수신 */
  applicantUid?: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface CreateMatchInput {
  teamId: string;
  teamName: string;
  sport: SportType; // 🔥 필수 필드: 팀의 sportType에서 복사
  date: Date;
  time: string;
  /** 경기 지역 (신규 canonical) */
  matchRegion?: string;
  /** 레거시 필드 (하위 호환) */
  region: string;
  stadium?: string;
  stadiumLat?: number;
  stadiumLng?: number;
  level: MatchLevel;
  fee?: number;
  contact: MatchContactMethod;
  contactDetail?: string;
  description?: string;
}
