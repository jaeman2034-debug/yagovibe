/**
 * 🔥 NavigateToSportHubFromQuery - 쿼리 파라미터에서 sport를 읽어 전역 Activity 또는 SportHub로 리다이렉트
 * 
 * 역할:
 * - /activity/feed?sport=soccer → /activity?sport=soccer (전역 Activity, 권장)
 * - 또는 /sports/soccer?tab=activity (스포츠 허브)
 * 
 * 정책: 전역 Activity로 리다이렉트 (종목 필터는 query로 처리)
 */

import { Navigate, useSearchParams } from "react-router-dom";

export default function NavigateToSportHubFromQuery() {
  const [searchParams] = useSearchParams();
  const sport = searchParams.get("sport");
  
  // 🔥 sport 파라미터가 있으면 전역 Activity로 리다이렉트 (종목 필터는 query로)
  if (sport) {
    return <Navigate to={`/activity?sport=${sport}`} replace />;
  }
  
  // 🔥 sport 파라미터가 없으면 전역 Activity로 리다이렉트
  return <Navigate to="/activity" replace />;
}
