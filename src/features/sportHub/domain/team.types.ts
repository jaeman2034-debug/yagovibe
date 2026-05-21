/**
 * 🔥 Team Types - 팀 도메인 모델
 * 
 * 팀이 1등 시민(First Class Citizen)
 */

import type { Region } from "./region.types";
import type { TeamRole } from "@/lib/team/roleConstants";

/**
 * 팀 레벨
 */
export type TeamLevel = "beginner" | "normal" | "pro";

/**
 * 팀 모집 상태
 */
export type TeamRecruitStatus = "OPEN" | "CLOSE" | "FULL";

/**
 * 팀 멤버 역할 (플랫폼 표준)
 * 
 * @see @/lib/team/roleConstants - TeamRole 타입 정의
 */
export type TeamMemberRole = TeamRole;

/**
 * 팀 멤버
 */
export type TeamMember = {
  userId: string;
  role: TeamMemberRole;
  joinedAt: string;      // ISO string
  status: "active" | "inactive" | "pending";
  position?: string;     // 포지션 (예: "FW", "MF", "DF", "GK")
  jerseyNumber?: number;
};

/**
 * 팀 일정
 */
export type TeamSchedule = {
  id: string;
  type: "match" | "training" | "event";
  title: string;
  date: string;          // ISO string
  groundId?: string;
  opponentTeamId?: string;
  status: "scheduled" | "completed" | "cancelled";
  result?: {
    homeScore?: number;
    awayScore?: number;
  };
};

/**
 * 팀
 */
export type Team = {
  id: string;
  region: Region;
  
  name: string;
  level: TeamLevel;
  description?: string;
  logoUrl?: string;
  
  homeGroundId?: string;  // 홈 구장
  
  members: TeamMember[];
  schedule: TeamSchedule[];
  
  recruitStatus: TeamRecruitStatus;
  recruitMessage?: string;
  
  stats: {
    totalMatches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  
  createdAt: string;
  updatedAt: string;
};

/**
 * 팀 가입 신청
 */
export type TeamJoinRequest = {
  id: string;
  teamId: string;
  userId: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};
