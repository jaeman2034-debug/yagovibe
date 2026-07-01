/**
 * CV-1 I9-1 — Growth Signals Simulation Preview (draft only)
 */
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrowthSignalSnapshotDto } from "@/lib/academy/academyCvGrowthSignalsReadTypes";

type Props = {
  linkId: string | null;
  mappingRuleVersion: string;
  signals: GrowthSignalSnapshotDto[];
};

function signalBadgeClass(type: GrowthSignalSnapshotDto["signalType"]): string {
  if (type.includes("awareness") || type.includes("decision")) {
    return "border-slate-300 bg-slate-50 text-slate-800";
  }
  if (type.includes("transition") || type.includes("positioning")) {
    return "border-indigo-300 bg-indigo-50 text-indigo-900";
  }
  return "border-orange-300 bg-orange-50 text-orange-950";
}

function formatConfidence(n: number): string {
  return n.toFixed(2);
}

export function CvGrowthSignalsDraftPreview({ linkId, mappingRuleVersion, signals }: Props) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-gray-900">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
        <Zap className="h-3.5 w-3.5" />
        Growth Signals Simulation (I9-1)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-amber-800">
          linkId: {linkId.slice(0, 12)}… · rule {mappingRuleVersion} · {signals.length} draft
          {signals.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {signals.length === 0 ? (
        <p className="mt-2 text-[11px] text-gray-600">
          growthSignals draft 없음 — approved interpretation 후 mapping 실행됩니다.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {signals.map((s) => (
            <li
              key={s.signalId}
              className="rounded-md border border-amber-100 bg-white/80 px-2 py-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    signalBadgeClass(s.signalType)
                  )}
                >
                  {s.signalType}
                </span>
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-950">
                  {s.status}
                </span>
                <span className="text-[10px] text-gray-600">
                  confidence {formatConfidence(s.confidence)}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-gray-700">
                sourceCandidateIds: {s.sourceCandidateIds.join(", ") || "—"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[10px] text-gray-500">
        I9-1 Simulation · FII · OVR · Avatar · playerGrowth* · Parent 금지 (I9 LOCK).
      </p>
    </div>
  );
}
