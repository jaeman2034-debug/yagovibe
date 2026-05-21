/**
 * 🔥 마켓 뷰 토글 상태 관리 (localStorage 연동)
 */

import { useState, useEffect } from "react";
import type { MarketView, Sport } from "../types";

const STORAGE_KEY_PREFIX = "marketView";

function track(event: string, payload: any) {
  console.log("[track]", event, payload);
  // 추후 GA/Firebase Analytics 연결
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", event, payload);
  }
}

export function useMarketView(contextSport: Sport = "soccer") {
  const KEY = `${STORAGE_KEY_PREFIX}:${contextSport}`;
  
  const [view, setView] = useState<MarketView>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(KEY) as MarketView | null;
      if (saved === "sport" || saved === "all") {
        return saved;
      }
    }
    return "sport";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, view);
    }
  }, [view, KEY]);

  const toggle = () => {
    const from = view;
    const to = view === "sport" ? "all" : "sport";
    setView(to);

    track("market_toggle_expand", {
      contextSport,
      from,
      to,
    });
  };

  return { view, toggle, isExpanded: view === "all" };
}
