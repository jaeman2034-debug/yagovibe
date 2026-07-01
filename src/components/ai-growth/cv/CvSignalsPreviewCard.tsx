/**
 * CV-1 I7 J5 — CV Signals Preview (read-only · Measured)
 */
import { Activity } from "lucide-react";
import type { CvSignalDto } from "@/lib/academy/academyCvGrowthLinksTypes";
import {
  cvSignalLabel,
  findCvSignal,
  formatCvSignalValue,
  J5_PREVIEW_SIGNAL_KEYS,
} from "@/components/ai-growth/cv/cvSignalUiHelpers";

type Props = {
  signals: CvSignalDto[];
  linkId?: string;
};

export function CvSignalsPreviewCard({ signals, linkId }: Props) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-xs text-gray-900">
      <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-900">
        <Activity className="h-3.5 w-3.5" />
        CV Signals Preview (J5)
        <span className="rounded-full border border-violet-300 bg-white px-2 py-0.5 text-[9px] font-semibold normal-case text-violet-800">
          Measured · read-only
        </span>
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-violet-800">
          linkId: {linkId.slice(0, 12)}…
        </p>
      ) : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {J5_PREVIEW_SIGNAL_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-md border border-violet-100 bg-white/70 px-2 py-1.5"
          >
            <p className="text-[10px] font-medium text-gray-600">{cvSignalLabel(key)}</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCvSignalValue(findCvSignal(signals, key))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
