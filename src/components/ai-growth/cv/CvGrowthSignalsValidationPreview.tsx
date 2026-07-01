/**
 * CV-1 I9-2 — Growth Signals Preview / Validation + What-if Compare
 */
import { GitCompare, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CvGrowthSignalValidationPanel } from "@/components/ai-growth/cv/CvGrowthSignalValidationPanel";
import type { InterpretationCandidateSnapshotDto } from "@/lib/academy/academyCvInterpretationReadTypes";
import type {
  GrowthSignalCompareResultDto,
  GrowthSignalSnapshotDto,
  GrowthSignalTypeDto,
  GrowthSignalValidationStatusDto,
} from "@/lib/academy/academyCvGrowthSignalsReadTypes";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string | null;
  mappingRuleVersion: string;
  signals: GrowthSignalSnapshotDto[];
  interpretationCandidates: InterpretationCandidateSnapshotDto[];
  compare: GrowthSignalCompareResultDto | null;
  onReviewed?: () => void;
};

type FilterStatus = "all" | GrowthSignalValidationStatusDto;
type GroupMode = "none" | "signalType" | "validationStatus";

function signalBadgeClass(type: GrowthSignalTypeDto): string {
  if (type.includes("awareness") || type.includes("decision")) {
    return "border-slate-300 bg-slate-50 text-slate-800";
  }
  if (type.includes("transition") || type.includes("positioning")) {
    return "border-indigo-300 bg-indigo-50 text-indigo-900";
  }
  return "border-orange-300 bg-orange-50 text-orange-950";
}

function validationBadgeClass(status: GrowthSignalValidationStatusDto): string {
  switch (status) {
    case "validated":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-900";
    case "pending":
    default:
      return "border-amber-300 bg-amber-50 text-amber-950";
  }
}

function formatConfidence(n: number): string {
  return n.toFixed(2);
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

export function CvGrowthSignalsValidationPreview({
  teamId,
  mediaId,
  linkId,
  mappingRuleVersion,
  signals,
  interpretationCandidates,
  compare,
  onReviewed,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSignalType, setFilterSignalType] = useState<string>("all");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");

  const candidateById = useMemo(() => {
    const map = new Map<string, InterpretationCandidateSnapshotDto>();
    for (const c of interpretationCandidates) {
      map.set(c.candidateId, c);
    }
    return map;
  }, [interpretationCandidates]);

  const signalTypes = useMemo(() => {
    const set = new Set(signals.map((s) => s.signalType));
    return [...set].sort();
  }, [signals]);

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      if (filterStatus !== "all" && s.validationStatus !== filterStatus) return false;
      if (filterSignalType !== "all" && s.signalType !== filterSignalType) return false;
      return true;
    });
  }, [signals, filterStatus, filterSignalType]);

  const grouped = useMemo(() => {
    if (groupMode === "none") {
      return [{ key: "all", items: filtered }];
    }
    const map = new Map<string, GrowthSignalSnapshotDto[]>();
    for (const s of filtered) {
      const key =
        groupMode === "signalType"
          ? s.signalType
          : (s.validationStatus ?? "pending");
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, items }));
  }, [filtered, groupMode]);

  return (
    <div
      className="rounded-lg border border-teal-200 bg-teal-50/40 px-3 py-2 text-xs text-gray-900"
      data-testid="cv-growth-signals-validation-preview"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-900">
        <Zap className="h-3.5 w-3.5" />
        Growth Signals Preview / Validation (I9-2)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-teal-800">
          linkId: {linkId.slice(0, 12)}… · rule {mappingRuleVersion} · {signals.length} draft
          {signals.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {signals.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="flex items-center gap-1 text-[10px] text-gray-700">
            Status
            <select
              className="rounded border border-teal-200 bg-white px-1 py-0.5 text-[10px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <option value="all">all</option>
              <option value="pending">pending</option>
              <option value="validated">validated</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-[10px] text-gray-700">
            signalType
            <select
              className="rounded border border-teal-200 bg-white px-1 py-0.5 text-[10px]"
              value={filterSignalType}
              onChange={(e) => setFilterSignalType(e.target.value)}
            >
              <option value="all">all</option>
              {signalTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-[10px] text-gray-700">
            Group
            <select
              className="rounded border border-teal-200 bg-white px-1 py-0.5 text-[10px]"
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            >
              <option value="none">none</option>
              <option value="signalType">signalType</option>
              <option value="validationStatus">validationStatus</option>
            </select>
          </label>
        </div>
      ) : null}

      {signals.length === 0 ? (
        <p className="mt-2 text-[11px] text-gray-600">
          growthSignals draft 없음 — approved interpretation 후 mapping 실행됩니다.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {grouped.map((group) => (
            <div key={group.key}>
              {groupMode !== "none" ? (
                <p className="mb-1 text-[10px] font-semibold uppercase text-teal-800">
                  {group.key} ({group.items.length})
                </p>
              ) : null}
              <ul className="space-y-2">
                {group.items.map((s) => {
                  const sourceId = s.sourceCandidateIds[0];
                  const source = sourceId ? candidateById.get(sourceId) : undefined;
                  return (
                    <li
                      key={s.signalId}
                      className="rounded-md border border-teal-100 bg-white/80 px-2 py-1.5"
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
                        <span className="rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-950">
                          {s.status}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                            validationBadgeClass(s.validationStatus ?? "pending")
                          )}
                        >
                          {s.validationStatus ?? "pending"}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          confidence {formatConfidence(s.confidence)}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-gray-700">
                        sourceCandidateIds: {s.sourceCandidateIds.join(", ") || "—"} · rule{" "}
                        {s.mappingRuleVersion}
                      </p>
                      {source ? (
                        <p className="mt-1 rounded border border-slate-100 bg-slate-50/80 px-2 py-1 text-[10px] text-slate-800">
                          Lineage · {source.candidateType} · review {source.reviewStatus ?? "—"} ·
                          conf {formatConfidence(source.confidence)}
                        </p>
                      ) : null}
                      {linkId ? (
                        <CvGrowthSignalValidationPanel
                          teamId={teamId}
                          mediaId={mediaId}
                          linkId={linkId}
                          signal={s}
                          onReviewed={onReviewed}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {compare ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
            <GitCompare className="h-3 w-3" />
            What-if Compare (I9-2)
          </p>
          <p className="mt-1 text-[10px] text-gray-700">
            match {compare.summary.match} · missing {compare.summary.missing} · extra{" "}
            {compare.summary.extra} · changed {compare.summary.changed}
          </p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {compare.entries.map((e) => (
              <li
                key={e.key}
                className={cn(
                  "rounded border px-2 py-0.5 font-mono text-[9px]",
                  compareKindClass(e.kind)
                )}
              >
                {e.kind} · {e.signalType} · {e.sourceCandidateIds[0]?.slice(0, 8) ?? "—"}
                {e.kind === "changed"
                  ? ` · ${e.persistedConfidence?.toFixed(2)} → ${e.simulatedConfidence?.toFixed(2)}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        I9-2 Preview · FII · OVR · Avatar · playerGrowth* · Parent 금지 (I9 LOCK).
      </p>
    </div>
  );
}
