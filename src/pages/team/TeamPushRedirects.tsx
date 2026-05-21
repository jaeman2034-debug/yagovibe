import { Navigate, useParams, useSearchParams } from "react-router-dom";

/** FCM/공유 링크: `/team/:id/overview` → 팀 홈(홈 탭) */
export function TeamOverviewPushRedirect() {
  const { teamId } = useParams<{ teamId: string }>();
  if (!teamId) return <Navigate to="/my-teams" replace />;
  return <Navigate to={`/team/${encodeURIComponent(teamId)}?tab=home`} replace />;
}

/**
 * FCM: `/team/:id/activities/:activityId?tab=attendance`
 * → 앱 내 실제 라우트(`/team/:id` + 쿼리)로 통일
 */
export function TeamActivityPushRedirect() {
  const { teamId, activityId } = useParams<{ teamId: string; activityId: string }>();
  const [sp] = useSearchParams();
  if (!teamId || !activityId) return <Navigate to="/my-teams" replace />;

  const next = new URLSearchParams();
  next.set("tab", "schedule");
  next.set("activityId", activityId);
  if (sp.get("tab") === "attendance") {
    next.set("focus", "attendance");
  }
  return <Navigate to={`/team/${encodeURIComponent(teamId)}?${next.toString()}`} replace />;
}
