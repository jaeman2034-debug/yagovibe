/** Phase A — academy create UI enums → createTeam CF contract (no schema drift). */

export const ACADEMY_AGE_GROUP_OPTIONS = [
  { id: "preschool", label: "유아", serverAgeGroup: "U-10" as const },
  { id: "elementary_lower", label: "초등 저학년", serverAgeGroup: "U-10" as const },
  { id: "elementary_upper", label: "초등 고학년", serverAgeGroup: "U-12" as const },
  { id: "middle_school", label: "중학생", serverAgeGroup: "U-15" as const },
  { id: "high_school", label: "고등학생", serverAgeGroup: "U-18" as const },
  { id: "mixed", label: "혼합 연령", serverAgeGroup: "U-12" as const },
] as const;

export type AcademyAgeGroupUiId = (typeof ACADEMY_AGE_GROUP_OPTIONS)[number]["id"];

export const ACADEMY_TRAINING_LEVEL_OPTIONS = [
  { id: "beginner", label: "입문·기초", serverLevel: "beginner" as const },
  { id: "growth", label: "성장 단계", serverLevel: "intermediate" as const },
  { id: "elite", label: "선발·대회", serverLevel: "elite" as const },
] as const;

export type AcademyTrainingLevelUiId = (typeof ACADEMY_TRAINING_LEVEL_OPTIONS)[number]["id"];

export function mapAcademyAgeGroupToServer(id: AcademyAgeGroupUiId): "U-10" | "U-12" | "U-15" | "U-18" {
  const row = ACADEMY_AGE_GROUP_OPTIONS.find((o) => o.id === id);
  return row?.serverAgeGroup ?? "U-12";
}

export function mapAcademyTrainingLevelToServer(
  id: AcademyTrainingLevelUiId
): "beginner" | "intermediate" | "elite" {
  const row = ACADEMY_TRAINING_LEVEL_OPTIONS.find((o) => o.id === id);
  return row?.serverLevel ?? "beginner";
}
