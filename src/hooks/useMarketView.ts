/**
 * 🔥 마켓 뷰 토글 상태 관리 (localStorage 연동)
 */

import { useState, useEffect } from "react";
import type { Sport, MarketView } from "@/types/market";

const STORAGE_KEY_PREFIX = "marketView";

export function useMarketView(contextSport: Sport, initialView?: MarketView) {
  const storageKey = `${STORAGE_KEY_PREFIX}:${contextSport}`;

  const [view, setView] = useState<MarketView>(() => {
    // localStorage에서 복원
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved === "sport" || saved === "all") {
        return saved;
      }
    }
    // 초기값 또는 기본값
    return initialView || "sport";
  });

  useEffect(() => {
    // localStorage에 저장
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, view);
    }
  }, [view, storageKey]);

  const toggleView = () => {
    setView(prev => prev === "sport" ? "all" : "sport");
  };

  const setViewExplicit = (newView: MarketView) => {
    setView(newView);
  };

  return {
    view,
    toggleView,
    setView: setViewExplicit,
    isExpanded: view === "all",
  };
}
