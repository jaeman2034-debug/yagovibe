import { useCallback, useEffect, useState } from "react";
import {
  callListTrainingBlocks,
  type TrainingBlockRow,
  type TrainingBlockStatus,
} from "@/features/academy/training-blocks/mutations/trainingBlockCallables";

export function useTrainingBlocksData(teamId: string, statusFilter?: TrainingBlockStatus) {
  const [blocks, setBlocks] = useState<TrainingBlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!teamId) {
      setBlocks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await callListTrainingBlocks({
        teamId,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setBlocks(res.blocks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "훈련 블록을 불러오지 못했습니다.");
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { blocks, loading, error, refresh };
}
