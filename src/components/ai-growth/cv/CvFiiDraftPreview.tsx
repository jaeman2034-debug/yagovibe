/**
 * CV-1 I9-3 — FII Draft Preview + What-if Compare
 */
import { Brain, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrowthSignalSnapshotDto } from "@/lib/academy/academyCvGrowthSignalsReadTypes";
import type {
  FiiAxisContributionDto,
  FiiDraftCompareResultDto,
  FiiDraftSnapshotDto,
  FiiV1AxisKeyDto,
} from "@/lib/academy/academyCvFiiDraftReadTypes";

type Props = {
  linkId: string | null;
  promotionRuleVersion: string;
  fiiEngineVersion: string;
  drafts: FiiDraftSnapshotDto[];
  growthSignals: GrowthSignalSnapshotDto[];
  compare: FiiDraftCompareResultDto | null;
};

const AXIS_LABELS: Record<FiiV1AxisKeyDto, string> = {
  spatial: "공간 인식",
  vision: "시야",
  decision: "의사결정",
  pressure: "압박 대응",
  tactics: "전술 이해도",
};

function axisBadgeClass(axis: FiiV1AxisKeyDto): string {
  switch (axis) {
    case "vision":
      return "border-sky-300 bg-sky-50 text-sky-900";
    case "decision":
      return "border-violet-300 bg-violet-50 text-violet-900";
    case "spatial":
      return "border-indigo-300 bg-indigo-50 text-indigo-900";
    case "pressure":
      return "border-orange-300 bg-orange-50 text-orange-950";
    case "tactics":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    default:
      return "border-gray-300 bg-gray-50 text-gray-800";
  }
}

function formatConfidence(n: number): string {
  return n <= 1 ? n.toFixed(2) : n.toFixed(0);
}

function compareKindClass(kind: string): string {
  switch (kind) {
    case "match":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "missing":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "extra":
      return "border-red-200 bg-red-50 text-red-900";
    case "changed":
      return "border-violet-200 bg-violet-50 text-violet-900";
    default:
      return "border-gray-200 bg-gray-50 text-gray-800";
  }
}

function ContributionRow({ c }: { c: FiiAxisContributionDto }) {
  const signal = c.proxy ? (
    <span className="text-[9px] text-amber-800">
      proxy · source={c.sourceSignalType ?? c.signalType}
    </span>
  ) : null;

  return (
    <li className="flex flex-wrap items-center gap-2 rounded border border-blue-100 bg-white/80 px-2 py-1">
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
          axisBadgeClass(c.axis)
        )}
      >
        {c.axis} · {AXIS_LABELS[c.axis]}
      </span>
      <span className="text-[10px] text-gray-700">
        ← {c.signalType} · conf {formatConfidence(c.confidence)}
      </span>
      <span className="font-mono text-[9px] text-gray-500">
        signal {c.sourceSignalId.slice(0, 10)}…
      </span>
      {signal}
    </li>
  );
}

export function CvFiiDraftPreview({
  linkId,
  promotionRuleVersion,
  fiiEngineVersion,
  drafts,
  growthSignals,
  compare,
}: Props) {
  const latest = drafts[0] ?? null;
  const signalById = new Map(growthSignals.map((s) => [s.signalId, s]));

  return (
    <div
      className="rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-gray-900"
      data-testid="cv-fii-draft-preview"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-900">
        <Brain className="h-3.5 w-3.5" />
        FII Draft Preview (I9-3)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-blue-800">
          linkId: {linkId.slice(0, 12)}… · rule {promotionRuleVersion} · engine {fiiEngineVersion}
        </p>
      ) : null}

      {!latest ? (
        <p className="mt-2 text-[11px] text-gray-600">
          fiiDraft 없음 — validated growthSignals 후 promotion 실행됩니다.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="rounded-md border border-blue-100 bg-white/80 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-950">
                {latest.status}
              </span>
              {latest.overallPreview !== null ? (
                <span className="text-[11px] font-semibold text-blue-900">
                  overallPreview {latest.overallPreview}
                </span>
              ) : (
                <span className="text-[10px] text-gray-600">overallPreview —</span>
              )}
            </div>
            <p className="mt-1 font-mono text-[10px] text-gray-700">
              sourceSignalIds: {latest.sourceSignalIds.join(", ") || "—"}
            </p>
            <ul className="mt-2 space-y-1">
              {latest.axisContributions.map((c, i) => (
                <ContributionRow key={`${c.sourceSignalId}-${c.axis}-${i}`} c={c} />
              ))}
            </ul>
            {latest.axisContributions.some((c) => c.sourceSignalId) ? (
              <div className="mt-2 space-y-1">
                {latest.axisContributions.slice(0, 3).map((c) => {
                  const gs = signalById.get(c.sourceSignalId);
                  if (!gs) return null;
                  return (
                    <p
                      key={`lineage-${c.sourceSignalId}`}
                      className="rounded border border-slate-100 bg-slate-50/80 px-2 py-0.5 text-[9px] text-slate-800"
                    >
                      Lineage · {gs.signalType} · validation {gs.validationStatus} → axis {c.axis}
                    </p>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {compare ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
            <GitCompare className="h-3 w-3" />
            What-if Compare (I9-3)
          </p>
          <p className="mt-1 text-[10px] text-gray-700">
            match {compare.summary.match} · missing {compare.summary.missing} · extra{" "}
            {compare.summary.extra} · changed {compare.summary.changed}
          </p>
          <ul className="mt-2 space-y-1">
            {compare.entries.map((e) => (
              <li
                key={e.key}
                className={cn(
                  "rounded border px-2 py-0.5 font-mono text-[9px]",
                  compareKindClass(e.kind)
                )}
              >
                {e.kind} · overall {e.persistedOverall ?? "—"} / {e.simulatedOverall ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        I9-3 FII Preview · playerGrowth* · OVR · Avatar · Parent 금지 (I9-3 LOCK).
      </p>
    </div>
  );
}
