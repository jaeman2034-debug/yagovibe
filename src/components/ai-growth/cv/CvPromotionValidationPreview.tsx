/**
 * CV-1 I10-3-2-1 — Promotion Preview Validation + Compare
 */
import { ArrowRightLeft, GitCompare } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CvPromotionValidationPanel } from "@/components/ai-growth/cv/CvPromotionValidationPanel";
import { CvPromotionWritePanel } from "@/components/ai-growth/cv/CvPromotionWritePanel";
import type {
  PromotionPreviewCompareResultDto,
  PromotionPreviewSnapshotDto,
  PromotionPreviewValidationStatusDto,
} from "@/lib/academy/academyCvPromotionPreviewReadTypes";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  previews: PromotionPreviewSnapshotDto[];
  compare: PromotionPreviewCompareResultDto | null;
  onReviewed?: () => void;
};

type FilterStatus = "all" | PromotionPreviewValidationStatusDto;
type GroupMode = "none" | "validationStatus";

function validationBadgeClass(status: PromotionPreviewValidationStatusDto): string {
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
    case "changed":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "no_sot":
      return "border-slate-200 bg-slate-50 text-slate-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-800";
  }
}

export function CvPromotionValidationPreview({
  teamId,
  mediaId,
  linkId,
  promotionRuleVersion,
  previews,
  compare,
  onReviewed,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");

  const filtered = useMemo(() => {
    return previews.filter((p) => {
      if (filterStatus !== "all" && p.validationStatus !== filterStatus) return false;
      return true;
    });
  }, [previews, filterStatus]);

  const grouped = useMemo(() => {
    if (groupMode === "none") return [{ key: "all", items: filtered }];
    const map = new Map<string, PromotionPreviewSnapshotDto[]>();
    for (const p of filtered) {
      const key = p.validationStatus ?? "pending";
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [filtered, groupMode]);

  return (
    <div
      className="rounded-lg border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-xs text-gray-900"
      data-testid="cv-promotion-validation-preview"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-900">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Promotion Validation (I10-3-2-1)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-indigo-800">
          linkId: {linkId.slice(0, 12)}… · rule {promotionRuleVersion}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <label className="flex items-center gap-1 text-[10px] text-gray-700">
          Filter
          <select
            className="rounded border border-indigo-200 bg-white px-1 py-0.5 text-[10px]"
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
          Group
          <select
            className="rounded border border-indigo-200 bg-white px-1 py-0.5 text-[10px]"
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as GroupMode)}
          >
            <option value="none">none</option>
            <option value="validationStatus">validationStatus</option>
          </select>
        </label>
      </div>

      {filtered.length < 1 ? (
        <p className="mt-2 text-[11px] text-gray-600">promotionPreview 없음 또는 필터 결과 없음.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {grouped.map((group) => (
            <div key={group.key}>
              {groupMode !== "none" ? (
                <p className="mb-1 text-[10px] font-semibold uppercase text-indigo-800">
                  {group.key} ({group.items.length})
                </p>
              ) : null}
              <ul className="space-y-2">
                {group.items.map((preview) => (
                  <li
                    key={preview.previewId}
                    className="rounded-md border border-indigo-100 bg-white/80 px-2 py-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-950">
                        {preview.status}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          validationBadgeClass(preview.validationStatus ?? "pending")
                        )}
                      >
                        {preview.validationStatus ?? "pending"}
                      </span>
                      <span className="text-[12px] font-bold text-indigo-900">
                        proposedOvr {preview.proposedOvr}
                      </span>
                      <span className="font-mono text-[10px] text-gray-500">
                        ovrDraft.ovr {preview.ovrDraftOvr}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-gray-700">
                      previewId: {preview.previewId.slice(0, 10)}… · ovrDraftId:{" "}
                      {preview.ovrDraftId.slice(0, 10)}…
                    </p>
                    {linkId ? (
                      <>
                        <CvPromotionValidationPanel
                          teamId={teamId}
                          mediaId={mediaId}
                          linkId={linkId}
                          preview={preview}
                          onReviewed={onReviewed}
                        />
                        <CvPromotionWritePanel
                          teamId={teamId}
                          mediaId={mediaId}
                          linkId={linkId}
                          preview={preview}
                          onPromoted={onReviewed}
                        />
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {compare ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
            <GitCompare className="h-3 w-3" />
            Current SoT → Proposed (read-only)
          </p>
          {compare.currentSoT ? (
            <div className="mt-2 grid gap-1 text-[10px] sm:grid-cols-2">
              <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                <p className="font-semibold text-slate-800">Current SoT</p>
                <p className="font-mono">
                  ovr {compare.currentSoT.ovr} · v {compare.currentSoT.vision} · p{" "}
                  {compare.currentSoT.pressure} · r {compare.currentSoT.recovery}
                </p>
              </div>
              <div className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1">
                <p className="font-semibold text-indigo-900">Proposed</p>
                <p className="font-mono">
                  ovr {filtered[0]?.proposedOvr ?? "—"} · v {filtered[0]?.proposedVision ?? "—"}{" "}
                  · p {filtered[0]?.proposedPressure ?? "—"} · r{" "}
                  {filtered[0]?.proposedRecovery ?? "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-gray-600">current SoT 없음</p>
          )}
          <ul className="mt-2 space-y-1">
            {compare.entries.map((e) => (
              <li
                key={e.key}
                className={cn(
                  "rounded border px-2 py-0.5 font-mono text-[9px]",
                  compareKindClass(e.kind)
                )}
              >
                {e.kind} · {e.key} current {e.current ?? "—"} → proposed {e.proposed ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        I10-3-2-1 Validation · I10-3-2-2 Conditional SoT Write · Avatar · Parent · History
        cascade 금지 · Rollback I10-3-2-3 보류.
      </p>
    </div>
  );
}
