import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  count?: number;
  compact?: boolean;
  className?: string;
};

function normalizeCount(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export default function SuperStrikerBadge({ count, compact = false, className }: Props) {
  const c = normalizeCount(count);
  if (c < 1) return null;

  const isGlow = c >= 3;
  const isAnimated = c >= 5;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
        isGlow
          ? "border-amber-300/80 bg-amber-100/85 text-amber-900 shadow-[0_0_14px_rgba(245,158,11,0.35)]"
          : "border-amber-200/90 bg-amber-50 text-amber-800",
        isAnimated && "animate-pulse",
        className
      )}
      title={`SUPER STRIKER · ${c}회`}
    >
      <Trophy className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
      <span>{compact ? `x${c}` : `SUPER STRIKER x${c}`}</span>
    </span>
  );
}

