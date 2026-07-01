import type { CvReviewStatus } from "@/lib/academy/academyCvTypes";

export function formatCvMetric(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function cvReviewStatusLabel(status: CvReviewStatus | undefined): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "candidate":
    default:
      return "Candidate";
  }
}

export function cvReviewStatusBadgeClass(status: CvReviewStatus | undefined): string {
  switch (status) {
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-900";
    case "candidate":
    default:
      return "border-amber-300 bg-amber-50 text-amber-950";
  }
}

export function formatCvProcessedAt(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export function formatCvDelta(before: number | undefined, after: number | undefined): string {
  if (before == null || after == null || !Number.isFinite(before) || !Number.isFinite(after)) {
    return "—";
  }
  return `${formatCvMetric(before)} → ${formatCvMetric(after)}`;
}
