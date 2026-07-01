/**
 * CV-1 I10-3-1 — Promotion Preview + SoT Compare (no write)
 */
import { ArrowRightLeft, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PromotionPreviewCompareResultDto,
  PromotionPreviewSnapshotDto,
} from "@/lib/academy/academyCvPromotionPreviewReadTypes";

type Props = {
  linkId: string | null;
  promotionRuleVersion: string;
  previews: PromotionPreviewSnapshotDto[];
  compare: PromotionPreviewCompareResultDto | null;
};

function compareKindClass(kind: string): string {
  switch (kind) {
    case "match":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "missing":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "changed":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "no_sot":
      return "border-slate-200 bg-slate-50 text-slate-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-800";
  }
}

export function CvPromotionPreviewPanel({
  linkId,
  promotionRuleVersion,
  previews,
  compare,
}: Props) {
  const latest = previews[0] ?? null;

  return (
    <div
      className="rounded-lg border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-xs text-gray-900"
      data-testid="cv-promotion-preview-panel"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-900">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Promotion Preview (I10-3-1)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-indigo-800">
          linkId: {linkId.slice(0, 12)}… · rule {promotionRuleVersion} · source cv_promotion
        </p>
      ) : null}

      {!latest ? (
        <p className="mt-2 text-[11px] text-gray-600">
          promotionPreview 없음 — validated ovrDraft 후 Core 3-axis 매핑됩니다.
        </p>
      ) : (
        <div className="mt-2 space-y-2 rounded-md border border-indigo-100 bg-white/80 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-950">
              {latest.status}
            </span>
            <span className="text-[12px] font-bold text-indigo-900">
              proposedOvr {latest.proposedOvr}
            </span>
            <span className="font-mono text-[10px] text-gray-500">
              ovrDraft.ovr {latest.ovrDraftOvr} (lineage · 미승격)
            </span>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {latest.proposedVision !== undefined ? (
              <li className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-900">
                vision {latest.proposedVision}
              </li>
            ) : null}
            {latest.proposedPressure !== undefined ? (
              <li className="rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-950">
                pressure {latest.proposedPressure}
              </li>
            ) : null}
            {latest.proposedRecovery !== undefined ? (
              <li className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
                recovery {latest.proposedRecovery} (proxy)
              </li>
            ) : null}
          </ul>
          <p className="font-mono text-[10px] text-gray-700">
            ovrDraftId: {latest.ovrDraftId.slice(0, 10)}… · fiiDraftId:{" "}
            {latest.fiiDraftId.slice(0, 10)}…
          </p>
          {latest.mappingNotes.length > 0 ? (
            <ul className="space-y-0.5 rounded border border-slate-100 bg-slate-50/80 px-2 py-1 text-[9px] text-slate-800">
              {latest.mappingNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-[9px] font-semibold text-indigo-900">
            Promotion Preview ≠ playerGrowthOvr write (I10-3-2 보류)
          </p>
        </div>
      )}

      {compare ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
            <GitCompare className="h-3 w-3" />
            Proposed vs Current SoT (read-only)
          </p>
          {compare.currentSoT ? (
            <p className="mt-1 font-mono text-[10px] text-gray-700">
              playerId: {compare.currentSoT.playerId.slice(0, 12)}… · source{" "}
              {compare.currentSoT.source ?? "—"}
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-gray-600">current SoT 없음 (read-only)</p>
          )}
          <p className="mt-1 text-[10px] text-gray-700">
            match {compare.summary.match} · changed {compare.summary.changed} · missing{" "}
            {compare.summary.missing} · no_sot {compare.summary.noSot}
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
                {e.kind} · {e.key} proposed {e.proposed ?? "—"} / current {e.current ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        I10-3-1 Preview only · playerGrowthOvr · Avatar · Parent write 금지 (I10 LOCK).
      </p>
    </div>
  );
}
