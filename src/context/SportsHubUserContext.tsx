import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSportsHubRecommendationInputs } from "@/hooks/useSportsHubRecommendationInputs";
import { getUserStage, type UserStage } from "@/lib/sportsHubRecommendation";

export type SportsHubUserContextValue = ReturnType<typeof useSportsHubRecommendationInputs> & {
  stage: UserStage;
};

const SportsHubUserContext = createContext<SportsHubUserContextValue | null>(null);

export function SportsHubUserProvider({ children }: { children: ReactNode }) {
  const data = useSportsHubRecommendationInputs();
  const stage = useMemo(() => getUserStage(data.userState), [data.userState]);
  const value = useMemo(() => ({ ...data, stage }), [data, stage]);
  return <SportsHubUserContext.Provider value={value}>{children}</SportsHubUserContext.Provider>;
}

export function useSportsHubUser(): SportsHubUserContextValue {
  const ctx = useContext(SportsHubUserContext);
  if (!ctx) {
    throw new Error("useSportsHubUser는 SportsHubUserProvider 안에서만 사용하세요.");
  }
  return ctx;
}
