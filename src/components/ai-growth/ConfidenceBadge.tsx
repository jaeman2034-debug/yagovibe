import { cn } from "@/lib/utils";
import type { GrowthConfidence } from "@/components/ai-growth/types";

const STYLES: Record<GrowthConfidence, string> = {
  HIGH: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MEDIUM: "bg-amber-100 text-amber-900 border-amber-200",
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
};

const HINT: Record<GrowthConfidence, string> = {
  HIGH: "어휘 매칭 강함 — 코치 승인 필요",
  MEDIUM: "가능성 높음 — 코치 검토 필요",
  LOW: "애매/불확실 — 코치 전용 후보",
};

export function ConfidenceBadge({ level }: { level: GrowthConfidence }) {
  return (
    <span
      title={HINT[level]}
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STYLES[level]
      )}
    >
      {level}
    </span>
  );
}

export function ConfidenceLegend() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
      <p className="font-medium text-gray-900">AI 해석 신뢰도 (신뢰도 ≠ 진실)</p>
      <p className="mt-0.5 text-[11px] text-gray-600">코치 검토가 최우선입니다.</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5">
        <li>
          <strong>HIGH</strong> — 어휘 매칭 강함
        </li>
        <li>
          <strong>MEDIUM</strong> — 가능성 높음, 검토 필요
        </li>
        <li>
          <strong>LOW</strong> — 애매/불확실
        </li>
      </ul>
    </div>
  );
}
