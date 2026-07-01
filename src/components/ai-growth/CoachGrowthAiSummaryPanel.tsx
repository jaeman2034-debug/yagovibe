import { cn } from "@/lib/utils";
import type { CoachGrowthAiSummarySections } from "@/lib/ai-growth/growthAiSummaryTypes";

type Props = {
  coach: CoachGrowthAiSummarySections;
  className?: string;
};

function SectionList({
  title,
  items,
  testId,
}: {
  title: string;
  items: string[];
  testId: string;
}) {
  if (items.length === 0) return null;
  return (
    <div data-testid={testId}>
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-xs text-slate-700">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sprint D-5.5-c — Step5 코치 AI 성장 요약 */
export function CoachGrowthAiSummaryPanel({ coach, className }: Props) {
  const hasContent =
    coach.strengths.length > 0 ||
    coach.weaknesses.length > 0 ||
    coach.risks.length > 0 ||
    coach.recommendedTraining.length > 0;

  if (!hasContent) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3",
        className
      )}
      data-testid="coach-growth-ai-summary"
      aria-label="코치 AI 성장 요약"
    >
      <p className="text-sm font-bold text-slate-900">🧠 코치 요약</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SectionList title="강점" items={coach.strengths} testId="coach-summary-strengths" />
        <SectionList title="약점" items={coach.weaknesses} testId="coach-summary-weaknesses" />
        <SectionList title="위험" items={coach.risks} testId="coach-summary-risks" />
        <SectionList title="권장 훈련" items={coach.recommendedTraining} testId="coach-summary-training" />
      </div>
    </section>
  );
}
