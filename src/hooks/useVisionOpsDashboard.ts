import { useCallback, useEffect, useState } from "react";
import { fetchVisionOpsDashboard } from "@/lib/vision/visionOpsDashboardService";
import type { VisionOpsDashboardData } from "@/lib/vision/visionOpsDashboardTypes";

export function useVisionOpsDashboard(teamId: string | undefined) {
  const [data, setData] = useState<VisionOpsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const tid = teamId?.trim();
    if (!tid) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchVisionOpsDashboard(tid);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
