/**
 * 🔥 Region Routes - 지역 멀티 허브 라우팅
 * 
 * /r/:region → 허브 홈
 * /r/:region/team
 * /r/:region/ground
 * /r/:region/market
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { RegionProvider } from "../context/RegionContext";

/**
 * 지역별 허브 라우트
 */
export function RegionRoutes() {
  return (
    <Routes>
      <Route
        path="/r/:region/*"
        element={
          <RegionProvider>
            {/* 여기에 지역별 허브 컴포넌트 연결 */}
            <div>Region Hub</div>
          </RegionProvider>
        }
      />
      <Route path="/" element={<Navigate to="/r/seoul" replace />} />
    </Routes>
  );
}
