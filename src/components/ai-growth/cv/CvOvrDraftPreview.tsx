/**
 * CV-1 I10-1 — OVR Draft Preview + What-if Compare
 */
import { Gauge, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FiiDraftSnapshotDto } from "@/lib/academy/academyCvFiiDraftReadTypes";
import type {
  OvrDraftCompareResultDto,
  OvrDraftSnapshotDto,
  OvrDraftValidationStatusDto,
  OvrV1AxisKeyDto,
} from "@/lib/academy/academyCvOvrDraftReadTypes";
import { CvOvrDraftValidationPanel } from "@/components/ai-growth/cv/CvOvrDraftValidationPanel";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string | null;
  ovrRuleVersion: string;
  fiiEngineVersion: string;
  promotionRuleVersion: string;
  drafts: OvrDraftSnapshotDto[];
  fiiDrafts: FiiDraftSnapshotDto[];
  compare: OvrDraftCompareResultDto | null;
  onReviewed?: () => void;
};

const AXIS_LABELS: Record<OvrV1AxisKeyDto, string> = {
  spatial: "공간 인식",
  vision: "시야",
  decision: "의사결정",
  pressure: "압박 대응",
  tactics: "전술 이해도",
};

const AXIS_ORDER: OvrV1AxisKeyDto[] = [
  "spatial",
  "vision",
  "decision",
  "pressure",
  "tactics",
];

function axisBadgeClass(axis: OvrV1AxisKeyDto): string {
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

function validationBadgeClass(status: OvrDraftValidationStatusDto): string {
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

export function CvOvrDraftPreview({
  teamId,
  mediaId,
  linkId,
  ovrRuleVersion,
  fiiEngineVersion,
  promotionRuleVersion,
  drafts,
  fiiDrafts,
  compare,
  onReviewed,
}: Props) {
  const latest = drafts[0] ?? null;
  const fiiById = new Map(fiiDrafts.map((d) => [d.draftId, d]));

  return (
    <div
      className="rounded-lg border border-rose-200 bg-rose-50/40 px-3 py-2 text-xs text-gray-900"
      data-testid="cv-ovr-draft-preview"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-900">
        <Gauge className="h-3.5 w-3.5" />
        OVR Draft Preview (I10-1)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-rose-800">
          linkId: {linkId.slice(0, 12)}… · ovr rule {ovrRuleVersion} · fii {fiiEngineVersion} ·
          promo {promotionRuleVersion}
        </p>
      ) : null}

      {!latest ? (
        <p className="mt-2 text-[11px] text-gray-600">
          ovrDraft 없음 — fiiDraft 후 OVR Formula v0 계산됩니다.
        </p>
      ) : (
        <div className="mt-2 space-y-2 rounded-md border border-rose-100 bg-white/80 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-950">
              {latest.status}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                validationBadgeClass(latest.validationStatus ?? "pending")
              )}
            >
              {latest.validationStatus ?? "pending"}
            </span>
            <span className="text-[12px] font-bold text-rose-900">OVR {latest.ovr}</span>
            <span className="font-mono text-[10px] text-gray-600">
              fiiDraftId: {latest.fiiDraftId.slice(0, 10)}…
            </span>
          </div>
          <p className="font-mono text-[10px] text-gray-700">
            sourceSignalIds: {latest.sourceSignalIds.join(", ") || "—"}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {AXIS_ORDER.map((axis) => {
              const score = latest.axisScores[axis];
              if (score === undefined) return null;
              return (
                <li
                  key={axis}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    axisBadgeClass(axis)
                  )}
                >
                  {axis} {score}
                </li>
              );
            })}
          </ul>
          {fiiById.get(latest.fiiDraftId) ? (
            <p className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1 text-[9px] text-slate-800">
              Lineage · fiiDraft overallPreview{" "}
              {fiiById.get(latest.fiiDraftId)?.overallPreview ?? "—"} → ovrDraft {latest.ovr}
              {" · "}
              OVR Draft ≠ playerGrowthOvr (I10-3 보류)
            </p>
          ) : null}
          <p className="text-[9px] text-gray-500">
            Formula v0: 0.20×(spatial+vision+decision+pressure+tactics) · observed axes only
          </p>
          {linkId ? (
            <CvOvrDraftValidationPanel
              teamId={teamId}
              mediaId={mediaId}
              linkId={linkId}
              draft={latest}
              onReviewed={onReviewed}
            />
          ) : null}
        </div>
      )}

      {compare ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
            <GitCompare className="h-3 w-3" />
            What-if Compare (I10-1)
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
                {e.kind} · ovr {e.persistedOvr ?? "—"} / {e.simulatedOvr ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        I10-1 OVR Draft Preview · I10-2 Validation · playerGrowthOvr · Avatar · Parent 금지 (I10
        LOCK).
      </p>
    </div>
  );
}
