/**
 * 🔥 Experiment Types - AB 테스트 타입 정의
 * 
 * 축구 허브 전용 실험 정의
 */

/**
 * 실험 키 (확장 가능)
 */
export type ExperimentKey =
  | "hub_storyzone_layout"    // 스토리 존 레이아웃
  | "hub_grid_order"          // 그리드 순서
  | "hub_storyzone_cta_copy"; // CTA 문구

/**
 * 변형 (A/B)
 */
export type Variant = "A" | "B";

/**
 * 실험 할당 결과
 */
export type ExperimentAssignment = {
  key: ExperimentKey;
  variant: Variant;
  assignedAt: string;
};
