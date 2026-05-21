/**
 * 🔥 Legacy Market Route → /market Redirect
 * 
 * 역할:
 * - 구형 라우트 (/soccer/market 등)를 /market로 리다이렉트
 * - sport 파라미터를 쿼리스트링으로 전달
 */

import { Navigate, useParams, useLocation } from "react-router-dom";

export default function LegacyMarketRedirect() {
  const { sport } = useParams<{ sport: string }>();
  const location = useLocation();

  // 기존 쿼리스트링 유지
  const qs = new URLSearchParams(location.search);
  
  // sport 파라미터를 쿼리스트링에 추가
  if (sport) {
    qs.set("sport", sport);
  }

  const queryString = qs.toString();
  const redirectPath = queryString ? `/market?${queryString}` : "/market";

  return <Navigate to={redirectPath} replace />;
}
