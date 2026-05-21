/**
 * 🔥 useStoriesForZone - UI에서 쓰는 훅
 * 
 * 라이브러리 없이 "최소 훅"으로 고정
 * 나중에 React Query로 바꾸더라도 바깥 인터페이스는 동일
 */

import { useEffect, useState } from "react";
import type { Story } from "../domain/story.types";
import type { Region } from "../domain/region.types";
import { loadStoriesForZone } from "../data/stories.repo";
import { useRegion } from "../context/RegionContext";

export function useStoriesForZone() {
  const region = useRegion();
  const [stories, setStories] = useState<Story[]>([]);
  const [mode, setMode] = useState<"default" | "season">("default");
  const [decisionReason, setDecisionReason] = useState("boot");
  const [from, setFrom] = useState<"api" | "cache" | "seed">("seed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      const res = await loadStoriesForZone(region);
      if (!alive) return;

      setStories(res.storiesForZone);
      setMode(res.mode);
      setDecisionReason(res.decisionReason);
      setFrom(res.from);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [region]); // region 변경 시 재조회

  return { stories, mode, decisionReason, from, loading };
}
