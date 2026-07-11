/**
 * Vision v6-7 — PlayTab pipeline status badge
 */

import { cn } from "@/lib/utils";
import {
  VISION_PIPELINE_STATUS_LABELS,
  VISION_PIPELINE_STEP_LABELS,
  type VisionPipelineUiStatus,
} from "@/lib/vision/visionRunTypes";

const STATUS_STYLES: Record<VisionPipelineUiStatus, string> = {
  none: "border-violet-500/30 bg-violet-950/40 text-violet-200",
  uploading: "border-sky-500/40 bg-sky-950/40 text-sky-100",
  queued: "border-amber-500/40 bg-amber-950/40 text-amber-100",
  retrying: "border-orange-500/40 bg-orange-950/40 text-orange-100 animate-pulse",
  analyzing: "border-indigo-500/40 bg-indigo-950/40 text-indigo-100 animate-pulse",
  completed: "border-emerald-500/40 bg-emerald-950/40 text-emerald-100",
  failed: "border-rose-500/40 bg-rose-950/40 text-rose-100",
  cancelled: "border-gray-500/40 bg-gray-900/40 text-gray-300",
};

type Props = {
  status: VisionPipelineUiStatus;
  pipelineStep?: string | null;
  progress?: number | null;
  variant?: "light" | "dark";
  className?: string;
};

export function VisionPipelineStatusBadge({
  status,
  pipelineStep,
  progress,
  variant = "dark",
  className,
}: Props) {
  if (status === "none") return null;

  const label = VISION_PIPELINE_STATUS_LABELS[status];
  const stepLabel =
    pipelineStep &&
    pipelineStep in VISION_PIPELINE_STEP_LABELS
      ? VISION_PIPELINE_STEP_LABELS[pipelineStep as keyof typeof VISION_PIPELINE_STEP_LABELS]
      : null;

  return (
    <span
      className={cn(
        "inline-flex flex-col items-start rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        variant === "dark"
          ? STATUS_STYLES[status]
          : "border-violet-200 bg-violet-50 text-violet-900",
        className
      )}
      data-testid={`vision-pipeline-status-${status}`}
    >
      <span>Vision · {label}</span>
      {stepLabel && (status === "analyzing" || status === "retrying") ? (
        <span className="mt-0.5 text-[9px] font-semibold normal-case opacity-90">
          {stepLabel}
          {typeof progress === "number" ? ` · ${progress}%` : ""}…
        </span>
      ) : null}
    </span>
  );
}
