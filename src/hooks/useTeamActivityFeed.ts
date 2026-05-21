import { useActivityFeed } from "./useActivityFeed";

/**
 * 팀 전용 `activities` 피드 (`teamId` + `visibility: team`)
 */
export function useTeamActivityFeed(teamId: string | undefined, pageSize = 20) {
  return useActivityFeed({
    sport: "all",
    teamId: teamId?.trim() ?? "",
    visibility: "team",
    pageSize,
  });
}
