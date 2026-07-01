import { cn } from "@/lib/utils";
import {
  computeFiiV1FromGrowthScore,
  fiiV1GradeLabel,
  type FiiV1Result,
} from "@/lib/fii/fiiEngineV1";
import type { GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import { formatDimensionScoreDisplay } from "@/lib/ai-growth/growthScore";
import { GlossaryQuickBar } from "@/components/glossary/GlossaryQuickBar";
import { GlossaryTooltip } from "@/components/glossary/GlossaryTooltip";

type Props = {
  growthScore: GrowthScoreResult;
  className?: string;
};

export function FiiScoreRationaleCard({ growthScore, className }: Props) {
  const fii: FiiV1Result = computeFiiV1FromGrowthScore(growthScore);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm",
        className
      )}
      data-testid="fii-score-rationale-card"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        <GlossaryTooltip termId="FII" showAsterisk /> 점수 근거 (v1)
      </p>
      <p className="mt-1 text-sm text-slate-700">
        종합 <strong className="tabular-nums text-slate-900">{fii.overall}점</strong> — Core
        3축(코치 검증 <GlossaryTooltip termId="GEV" />)에서{" "}
        <GlossaryTooltip termId="FII" /> 5축으로 환산
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <CoreChip termId="SCAN" score={fii.coreInputs.scan} />
        <CoreChip termId="PRESS" label="압박" score={fii.coreInputs.press} />
        <CoreChip label="회복" score={fii.coreInputs.recovery} />
      </div>

      <p className="mt-3 text-[11px] font-semibold text-slate-600">
        <GlossaryTooltip termId="FII" /> 5축 환산
      </p>
      <ul className="mt-2 space-y-2">
        {fii.axes.map((axis) => (
          <li
            key={axis.key}
            className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">{axis.labelKo}</span>
              <span className="tabular-nums font-bold text-indigo-900">
                {formatDimensionScoreDisplay(axis.score)}
                {axis.score !== null ? (
                  <span className="ml-1 text-[10px] font-medium text-slate-500">
                    ({fiiV1GradeLabel(axis.score)})
                  </span>
                ) : null}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{axis.rationale}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">{fii.overallFormula}</p>
      <GlossaryQuickBar className="mt-3" />
    </div>
  );
}

function CoreChip({
  label,
  termId,
  score,
}: {
  label?: string;
  termId?: "SCAN" | "PRESS";
  score: number | null;
}) {
  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold text-indigo-700">
        {termId ? <GlossaryTooltip termId={termId} label={label} /> : label}
      </p>
      <p className="text-sm font-bold tabular-nums text-indigo-950">
        {formatDimensionScoreDisplay(score)}
      </p>
    </div>
  );
}
