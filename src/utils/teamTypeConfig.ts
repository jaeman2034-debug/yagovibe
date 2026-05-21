/**
 * 🔥 팀 타입별 설정 (커스터마이징 시스템)
 */

export type TeamType = "club" | "study" | "hobby";

export interface TeamTypeConfig {
  label: string;
  description: string;
  emoji: string;
  color: string;
  // 점수 정책
  attendanceScore: number;
  messageScore: number;
  messageBonusThreshold: number;
  messageBonusScore: number;
  eventScore: number;
  noticeScore: number;
  // 기능 강조
  showAttendance: boolean;
  showRanking: boolean;
  showMVP: boolean;
  showWeeklyGoal: boolean;
  showPhotoUpload: boolean;
}

export const TEAM_TYPE_CONFIG: Record<TeamType, TeamTypeConfig> = {
  club: {
    label: "대학 동아리",
    description: "출석 관리와 활동 참여율 중심",
    emoji: "🎓",
    color: "#3b82f6",
    // 점수 정책
    attendanceScore: 3,
    messageScore: 1,
    messageBonusThreshold: 10,
    messageBonusScore: 5,
    eventScore: 10,
    noticeScore: 3,
    // 기능 강조
    showAttendance: true,
    showRanking: true,
    showMVP: true,
    showWeeklyGoal: false,
    showPhotoUpload: true,
  },
  study: {
    label: "스터디 모임",
    description: "학습 관리와 일정 중심",
    emoji: "📚",
    color: "#8b5cf6",
    // 점수 정책
    attendanceScore: 5, // 스터디는 출석이 더 중요
    messageScore: 1,
    messageBonusThreshold: 10,
    messageBonusScore: 5,
    eventScore: 10,
    noticeScore: 3,
    // 기능 강조
    showAttendance: true,
    showRanking: false, // 랭킹보다 꾸준함 강조
    showMVP: false,
    showWeeklyGoal: true, // 주간 목표 카드
    showPhotoUpload: false,
  },
  hobby: {
    label: "취미/소모임",
    description: "가볍게 놀기, 이벤트 중심",
    emoji: "🎨",
    color: "#f59e0b",
    // 점수 정책
    attendanceScore: 2, // 가볍게
    messageScore: 1,
    messageBonusThreshold: 10,
    messageBonusScore: 5,
    eventScore: 15, // 이벤트 참석이 더 중요
    noticeScore: 2,
    // 기능 강조
    showAttendance: false, // 출석 체크는 선택적
    showRanking: false,
    showMVP: false,
    showWeeklyGoal: false,
    showPhotoUpload: true, // 인증샷 강조
  },
};

/**
 * 팀 타입별 설정 조회
 */
export function getTeamTypeConfig(type: TeamType | string | undefined): TeamTypeConfig {
  if (!type || !(type in TEAM_TYPE_CONFIG)) {
    return TEAM_TYPE_CONFIG.club; // 기본값: 대학 동아리
  }
  return TEAM_TYPE_CONFIG[type as TeamType];
}
