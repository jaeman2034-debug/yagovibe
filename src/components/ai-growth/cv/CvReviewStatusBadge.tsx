import type { CvReviewStatus } from "@/lib/academy/academyCvTypes";
import { cn } from "@/lib/utils";
import {
  cvReviewStatusBadgeClass,
  cvReviewStatusLabel,
} from "@/components/ai-growth/cv/cvRunUiHelpers";

export function CvReviewStatusBadge({
  status,
  className,
}: {
  status: CvReviewStatus | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cvReviewStatusBadgeClass(status),
        className
      )}
    >
      {cvReviewStatusLabel(status)}
    </span>
  );
}
