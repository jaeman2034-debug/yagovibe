/**
 * 🔥 SportHub Redirect - 레거시 라우트를 SportHub로 리다이렉트
 */

import { Navigate, useParams, useLocation } from "react-router-dom";

interface SportHubRedirectProps {
  defaultTab?: "activity" | "market" | "team" | "event";
}

export default function SportHubRedirect({ defaultTab = "activity" }: SportHubRedirectProps) {
  const { sport } = useParams<{ sport: string }>();
  const location = useLocation();

  if (!sport) {
    return <Navigate to="/" replace />;
  }

  // 기존 쿼리스트링 유지
  const qs = new URLSearchParams(location.search);
  if (!qs.has("tab")) {
    qs.set("tab", defaultTab);
  }

  return <Navigate to={`/sports/${sport}?${qs.toString()}`} replace />;
}
