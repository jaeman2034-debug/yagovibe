/**
 * 🏃 러닝 크루 타입 정의
 * 
 * 러닝 크루는 YAGO의 첫 번째 실전 타겟
 */

export interface RunningCrew {
  id: string;
  name: string;
  description?: string;
  
  // 집결지
  meetingPoint: {
    lat: number;
    lng: number;
    name: string;
    address?: string;
  };
  
  // 정기 모임 시간
  regularSchedule: {
    dayOfWeek: number; // 0-6 (일요일=0)
    time: string; // "19:00"
    timezone?: string;
  }[];
  
  // 크루 설정
  settings: {
    autoCheckIn: boolean; // 도착 시 자동 출석
    checkInRadius: number; // 출석 인정 반경 (미터, 기본 50m)
    allowLateJoin: boolean; // 지각 허용 여부
    lateJoinMinutes: number; // 지각 허용 시간 (분)
  };
  
  // 크루원
  members: RunningCrewMember[];
  
  // 크루장
  captainId: string;
  
  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
}

export interface RunningCrewMember {
  userId: string;
  joinedAt: Date;
  status: "active" | "inactive" | "left";
  stats: {
    totalSessions: number;
    consecutiveDays: number;
    lastAttendedAt?: Date;
  };
}

export interface RunningCrewSession {
  id: string;
  crewId: string;
  scheduledAt: Date; // 예정된 모임 시간
  actualStartAt?: Date; // 실제 시작 시간
  
  // 참석자
  attendees: {
    userId: string;
    status: "departing" | "arrived" | "absent" | "late";
    departedAt?: Date;
    arrivedAt?: Date;
    movementSessionId?: string; // Movement Session ID
  }[];
  
  // 세션 상태
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  
  createdAt: Date;
  updatedAt: Date;
}

export interface RunningCrewInvite {
  id: string;
  crewId: string;
  inviteCode: string;
  expiresAt?: Date;
  maxUses?: number;
  usedCount: number;
  createdBy: string;
  createdAt: Date;
}
