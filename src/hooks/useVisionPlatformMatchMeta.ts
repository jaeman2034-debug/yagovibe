/**
 * RC4-5 M5 — Match metadata for platform nav / timeline (fii_summary pilot)
 */

import { useEffect, useState } from "react";
import {
  buildCoachMatchDetailFromFiiSummary,
  type CoachMatchDetailView,
} from "@/lib/vision/fiiSummaryCoachProvider";
import {
  loadFiiSummaryPilotFixture,
  shouldUseFiiSummaryPilot,
} from "@/lib/vision/fiiSummaryLoader";

export function useVisionPlatformMatchMeta(matchId: string | undefined) {
  const [meta, setMeta] = useState<CoachMatchDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const isPilot = shouldUseFiiSummaryPilot(matchId);

  useEffect(() => {
    if (!isPilot) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadFiiSummaryPilotFixture()
      .then((doc) => {
        if (!cancelled) setMeta(buildCoachMatchDetailFromFiiSummary(doc));
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPilot, matchId]);

  return { meta, loading, isPilot };
}
