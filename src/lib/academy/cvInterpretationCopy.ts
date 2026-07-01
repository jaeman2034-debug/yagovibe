/** I8 — measured signal → coach-readable Korean interpretation (preview only) */

function normalizeRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? Math.min(value / 100, 1) : Math.max(0, Math.min(value, 1));
}

export function formatSignalInterpretation(key: string, value: number): string | null {
  const v = normalizeRatio(value);
  switch (key) {
    case "VISIBILITY_RATIO":
      if (v >= 0.6) return "선수 추적 안정성이 양호합니다.";
      if (v >= 0.4) return "선수 추적 안정성이 보통 수준입니다.";
      return "선수 추적 안정성이 낮아 보완이 필요합니다.";
    case "TRACKING_COVERAGE":
      if (v >= 0.75) return "경기 대부분 구간에서 추적이 유지되었습니다.";
      if (v >= 0.5) return "추적 구간이 일부 끊겼습니다.";
      return "추적 유지 구간이 짧아 재분석을 권장합니다.";
    case "SESSION_CONFIDENCE":
      if (v >= 0.7) return "세션 전반의 분석 신뢰도가 높습니다.";
      if (v >= 0.45) return "세션 분석 신뢰도가 보통입니다.";
      return "세션 분석 신뢰도가 낮습니다.";
    case "ROI_QUALITY":
      if (v >= 0.6) return "ROI 영역 품질이 분석에 적합합니다.";
      if (v >= 0.4) return "ROI 영역 품질이 보통입니다.";
      return "ROI 영역 품질이 낮아 재설정을 검토하세요.";
    case "MOVEMENT_CONSISTENCY":
      if (v >= 0.6) return "움직임 패턴이 비교적 일관됩니다.";
      if (v >= 0.4) return "움직임 패턴 변동이 있습니다.";
      return "움직임 패턴이 불안정합니다.";
    case "FLOW_STABILITY":
      if (v >= 0.6) return "플레이 흐름 안정성이 양호합니다.";
      if (v >= 0.4) return "플레이 흐름 변동이 관찰됩니다.";
      return "플레이 흐름이 자주 끊깁니다.";
    case "PHYSICAL_ACTIVITY_INDEX":
      if (v >= 0.6) return "활동 강도가 충분히 높습니다.";
      if (v >= 0.35) return "활동 강도가 보통입니다.";
      return "활동 강도가 낮습니다.";
    case "PHYSICAL_RELATIVE_DISTANCE":
      if (v >= 0.55) return "이동 거리가 훈련 기준 대비 양호합니다.";
      if (v >= 0.35) return "이동 거리가 보통 수준입니다.";
      return "이동 거리가 부족합니다.";
    case "PHYSICAL_HIGH_INTENSITY_RUNS":
      if (v >= 0.5) return "고강도 런 빈도가 충분합니다.";
      if (v >= 0.3) return "고강도 런 빈도가 보통입니다.";
      return "고강도 런 빈도가 낮습니다.";
    default:
      return null;
  }
}
