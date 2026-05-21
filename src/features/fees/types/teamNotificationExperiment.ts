/** teams/{teamId}/experiments/{experimentId} — Functions 집계 스냅샷 */
export type ExperimentVariantBucket = {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  reRegisterConverted: number;
};

export type ExperimentRollout = "winner_only" | string;

export type TeamExperimentDoc = {
  experimentId: string;
  variantA: ExperimentVariantBucket;
  variantB: ExperimentVariantBucket;
  updatedAt?: unknown;
  /** 확정 승자 (rollout 시) */
  winner?: "A" | "B";
  decidedAt?: unknown;
  rollout?: ExperimentRollout;
};
