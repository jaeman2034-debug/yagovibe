/**
 * 팀 도메인 Cloud Functions
 * - 팀 생성, 이벤트/공지 트리거, 활동 점수
 * - 팀 멤버 동기화 (team_members 인덱스 자동 관리)
 */

export { createTeam } from "../createTeam";
export { onTeamCreated } from "./onTeamCreated";
export { onEventCreated } from "./onEventCreated";
export { onEventAttendScore } from "./onEventAttendScore";
export { onNoticeScore } from "./onNoticeScore";
export { onNoticeCreated } from "./onNoticeCreated";
export { onMessageScore } from "./onMessageScore";
export { eventReminder } from "./eventReminder";
export {
  onTeamMemberCreate,
  onTeamMemberDelete,
  onTeamMemberUpdate,
} from "./syncTeamMembers";
