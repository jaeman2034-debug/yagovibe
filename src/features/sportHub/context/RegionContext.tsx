/**
 * 🔥 Region Context - 지역 멀티 허브 컨텍스트
 * 
 * Region First 아키텍처
 */

import { createContext, useContext, ReactNode } from "react";
import type { Region } from "../domain/region.types";
import { getDefaultRegion, isValidRegion } from "../domain/region.types";

const RegionContext = createContext<Region | null>(null);

interface RegionProviderProps {
  children: ReactNode;
  region?: string;
}

/**
 * Region Provider
 */
export function RegionProvider({ children, region }: RegionProviderProps) {
  // region 파라미터 검증 및 기본값
  const validRegion = region && isValidRegion(region) ? region : getDefaultRegion();

  return (
    <RegionContext.Provider value={validRegion}>
      {children}
    </RegionContext.Provider>
  );
}

/**
 * Region Hook
 */
export function useRegion(): Region {
  const context = useContext(RegionContext);
  if (!context) {
    // Context 없으면 기본 지역 반환
    return getDefaultRegion();
  }
  return context;
}
