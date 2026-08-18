/** Sprint E-2.2 — Coach Training Planner */

export type TrainingPlanDayKey = "mon" | "wed" | "fri";

export type TrainingPlanIntensity = "low" | "medium" | "high";

export type TrainingPlanTheme =
  | "recovery"
  | "transition"
  | "vision"
  | "pressure"
  | "mixed"
  | "maintenance";

export type TrainingPlanDay = {
  dayKey: TrainingPlanDayKey;
  dayLabel: string;
  theme: TrainingPlanTheme;
  themeLabel: string;
  intensity: TrainingPlanIntensity;
  detail: string | null;
};

export type CoachTrainingPlannerResult = {
  headline: string;
  subline: string | null;
  days: TrainingPlanDay[];
};
