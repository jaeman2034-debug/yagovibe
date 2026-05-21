/**
 * 🔥 Global Routes - 글로벌 라우팅
 * 
 * /kr/r/seoul
 * /jp/r/tokyo
 * /vn/r/hanoi
 */

import { Routes, Route, Navigate, useParams } from "react-router-dom";
import type { Country } from "../domain/global.types";
import { RegionProvider } from "../context/RegionContext";

/**
 * 국가별 Region Provider
 */
function CountryRegionProvider({ children }: { children: React.ReactNode }) {
  const { country, region } = useParams<{ country: Country; region: string }>();
  
  // country + region을 합쳐서 region code 생성
  const fullRegion = region ? `${country}-${region}` : undefined;
  
  return (
    <RegionProvider region={fullRegion}>
      {children}
    </RegionProvider>
  );
}

/**
 * 글로벌 라우트
 */
export function GlobalRoutes() {
  return (
    <Routes>
      <Route
        path="/:country/r/:region/*"
        element={
          <CountryRegionProvider>
            {/* 여기에 지역별 허브 컴포넌트 연결 */}
            <div>Global Hub</div>
          </CountryRegionProvider>
        }
      />
      <Route path="/" element={<Navigate to="/kr/r/seoul" replace />} />
    </Routes>
  );
}
