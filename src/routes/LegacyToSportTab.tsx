/**
 * 🔥 Legacy Route → Canonical Route Redirect
 * 
 * 역할:
 * - 구형 라우트를 표준 라우트로 리다이렉트
 * - 쿼리스트링 유지
 */

import { Navigate, useParams, useLocation } from "react-router-dom";

interface LegacyToSportTabProps {
  tab: "activity" | "market" | "team" | "event";
}

export default function LegacyToSportTab({ tab }: LegacyToSportTabProps) {
  const { sport } = useParams<{ sport: string }>();
  const location = useLocation();

  if (!sport) {
    return <Navigate to="/" replace />;
  }

  // 기존 쿼리스트링(view=all 등) 유지
  const qs = new URLSearchParams(location.search);
  qs.set("tab", tab);

  return <Navigate to={`/sports/${sport}?${qs.toString()}`} replace />;
}
