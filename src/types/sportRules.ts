/**
 * 🔥 스포츠 규칙 타입 정의
 * 
 * 역할: 종목별 경기 규칙 및 통계 기준 정의
 * 경로: sport_rules/{sportType}
 */

/**
 * 스포츠 규칙
 */
export interface SportRules {
  sportType: string;
  
  // 팀 구성
  playersPerTeam: number;        // 경기당 선수 수
  substitutesAllowed: number;     // 교체 가능 인원 (무제한이면 -1)
  
  // 경기 시간
  matchDuration: number;         // 총 경기 시간 (분)
  halfDuration: number;          // 전반/후반 시간 (분)
  extraTime?: number;            // 연장전 시간 (분)
  
  // 규칙
  offsideRule: boolean;           // 오프사이드 규칙 적용 여부
  penaltyShootout: boolean;      // 승부차기 가능 여부
  
  // 통계 기준
  statsEnabled: {
    goals: boolean;
    assists: boolean;
    shots: boolean;
    cards: boolean;
    minutes: boolean;
    saves?: boolean;              // 골키퍼 세이브 (축구/풋살)
    passes?: boolean;             // 패스 (선택적)
  };
  
  // 추가 규칙
  rules?: {
    [key: string]: any;
  };
  
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * 축구 규칙 (기본값)
 */
export const FOOTBALL_RULES: Omit<SportRules, "sportType" | "createdAt"> = {
  playersPerTeam: 11,
  substitutesAllowed: 3,
  matchDuration: 90,
  halfDuration: 45,
  extraTime: 30,
  offsideRule: true,
  penaltyShootout: true,
  statsEnabled: {
    goals: true,
    assists: true,
    shots: true,
    cards: true,
    minutes: true,
    saves: true,
    passes: true,
  },
};

/**
 * 풋살 규칙 (기본값)
 */
export const FUTSAL_RULES: Omit<SportRules, "sportType" | "createdAt"> = {
  playersPerTeam: 5,
  substitutesAllowed: -1,  // 무제한 교체
  matchDuration: 40,
  halfDuration: 20,
  extraTime: 10,
  offsideRule: false,  // 풋살은 오프사이드 없음
  penaltyShootout: true,
  statsEnabled: {
    goals: true,
    assists: true,
    shots: true,
    cards: true,
    minutes: true,
    saves: true,
    passes: true,
  },
};
