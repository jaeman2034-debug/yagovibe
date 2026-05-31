import { Navigate, useParams } from "react-router-dom";
import TeamAiAnalysisLitePage from "@/pages/team/TeamAiAnalysisLitePage";
import { teamAiAnalysisLitePath } from "@/lib/team/teamAiAnalysisLite";

export function TeamAiAnalysisLiteRoute() {
  const { teamId } = useParams<{ teamId: string }>();
  if (!teamId?.trim()) {
    return <Navigate to="/my-teams" replace />;
  }
  return <TeamAiAnalysisLitePage teamId={teamId.trim()} />;
}

/** 레거시 `/teams/:teamId/ai-analysis` → canonical `/team/:teamId/ai-analysis` */
export function TeamsAiAnalysisLiteRedirect() {
  const { teamId } = useParams<{ teamId: string }>();
  if (!teamId?.trim()) {
    return <Navigate to="/my-teams" replace />;
  }
  return <Navigate to={teamAiAnalysisLitePath(teamId.trim())} replace />;
}
