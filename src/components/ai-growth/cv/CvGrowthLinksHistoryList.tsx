/**
 * CV-1 I7 J5 — cvGrowthLinks append-only history (read-only)
 */
import { Link2 } from "lucide-react";
import type { CvGrowthLinkSnapshot } from "@/lib/academy/academyCvGrowthLinksRead";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";
import { cn } from "@/lib/utils";

type Props = {
  history: CvGrowthLinkSnapshot[];
};

export function CvGrowthLinksHistoryList({ history }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-xs text-gray-900">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-800">
        <Link2 className="h-3.5 w-3.5" />
        cvGrowthLinks History ({history.length})
      </p>
      {history.length === 0 ? (
        <p className="mt-2 text-[11px] text-gray-600">추출된 growth link가 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {history.map((link) => (
            <li
              key={link.linkId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5"
            >
              <span className="font-mono text-[10px] text-gray-800">
                {link.linkId.slice(0, 10)}…
              </span>
              <span className="text-[10px] text-gray-600">
                {formatCvProcessedAt(link.createdAt ?? link.extractedAt)}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-gray-700">
                signals {link.signalCount}
              </span>
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                  link.reviewStatus === "accepted" && "border-emerald-300 bg-emerald-50 text-emerald-900",
                  link.reviewStatus === "rejected" && "border-red-300 bg-red-50 text-red-900",
                  (!link.reviewStatus || link.reviewStatus === "candidate") &&
                    "border-amber-300 bg-amber-50 text-amber-950"
                )}
              >
                {link.reviewStatus ?? "candidate"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
