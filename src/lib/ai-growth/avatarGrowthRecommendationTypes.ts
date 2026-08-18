/** Sprint D-5.1 — Avatar Growth Recommendation Engine types */

export type GrowthStatAxis = "vision" | "pressure" | "recovery";

export type AvatarGrowthRecommendationKind =
  | "training_focus"
  | "badge"
  | "level"
  | "session";

export type AvatarGrowthRecommendation = {
  id: string;
  kind: AvatarGrowthRecommendationKind;
  priority: number;
  emoji: string;
  title: string;
  detail: string;
  stat?: GrowthStatAxis;
  remaining?: number;
};

export type AvatarGrowthRecommendationBundle = {
  /** 가장 낮은 스탯 축 — 훈련 집중 추천 */
  primaryStat: GrowthStatAxis | null;
  primaryFocusLabel: string | null;
  recommendations: AvatarGrowthRecommendation[];
};
