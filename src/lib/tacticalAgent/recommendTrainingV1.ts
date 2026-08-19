import type { FiiV1AxisKey, FiiV1Result } from "@/lib/fii/fiiEngineV1";

export type TrainingPriority = "A" | "B" | "C";

export type TrainingRecommendation = {
  axis: FiiV1AxisKey;
  axisLabelKo: string;
  title: string;
  durationMinutes: number;
  priority: TrainingPriority;
  rationale: string;
};

const DRILL_CATALOG: Record<
  FiiV1AxisKey,
  Array<{ title: string; durationMinutes: number; triggerBelow: number }>
> = {
  spatial: [
    { title: "4v4 공간 창출 미니게임", durationMinutes: 12, triggerBelow: 72 },
    { title: "3존 패스·이동 공간 인식", durationMinutes: 10, triggerBelow: 78 },
  ],
  vision: [
    { title: "헤드업 패스 서클", durationMinutes: 10, triggerBelow: 72 },
    { title: "360° 시야 스캔 드릴", durationMinutes: 8, triggerBelow: 78 },
  ],
  decision: [
    { title: "2v1 의사결정 연속 플레이", durationMinutes: 10, triggerBelow: 72 },
    { title: "제한 터치 빌드업", durationMinutes: 12, triggerBelow: 78 },
  ],
  pressure: [
    { title: "3v2 압박 탈출 훈련", durationMinutes: 10, triggerBelow: 72 },
    { title: "Rondo 압박 대응 (4v2)", durationMinutes: 8, triggerBelow: 78 },
  ],
  tactics: [
    { title: "전환 후 5초 내 재공격", durationMinutes: 10, triggerBelow: 72 },
    { title: "오버·언더 래핑 패턴", durationMinutes: 12, triggerBelow: 78 },
  ],
};

/**
 * FII v1 약점 축 → 훈련 추천 (최대 3건, 우선도 A/B/C)
 */
export function recommendTrainingV1(fii: FiiV1Result): TrainingRecommendation[] {
  const observed = fii.axes.filter((a) => a.score !== null);
  if (!observed.length) return [];

  const sorted = [...observed].sort((a, b) => (a.score ?? 100) - (b.score ?? 100));
  const out: TrainingRecommendation[] = [];

  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const axis = sorted[i]!;
    const score = axis.score ?? 0;
    const drills = DRILL_CATALOG[axis.key];
    const drill =
      drills.find((d) => score < d.triggerBelow) ?? drills[0]!;
    const priority: TrainingPriority = i === 0 ? "A" : i === 1 ? "B" : "C";

    out.push({
      axis: axis.key,
      axisLabelKo: axis.labelKo,
      title: drill.title,
      durationMinutes: drill.durationMinutes,
      priority,
      rationale: `${axis.labelKo} ${score}점 — ${axis.rationale}`,
    });
  }

  return out;
}
