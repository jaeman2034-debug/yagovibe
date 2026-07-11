/**
 * Vision v6-4 — shared Loading / Empty / Error shell for Vision cards
 */

import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisionCoachSurfaceVariant } from "@/components/vision/VisionCoachDashboardProvider";

export type VisionCardFrameProps = {
  title: string;
  testId: string;
  variant?: VisionCoachSurfaceVariant;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  children: ReactNode;
};

export function VisionCardFrame({
  title,
  testId,
  variant = "light",
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "표시할 데이터가 없습니다.",
  className,
  children,
}: VisionCardFrameProps) {
  const isDark = variant === "dark";

  const shell = cn(
    "rounded-2xl border p-4 shadow-sm",
    isDark
      ? "border-violet-500/30 bg-violet-950/40 text-violet-50"
      : "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/60",
    className
  );

  const titleClass = cn(
    "text-[10px] font-bold uppercase tracking-wide",
    isDark ? "text-violet-300" : "text-violet-700"
  );

  if (loading) {
    return (
      <section className={shell} data-testid={`${testId}-loading`} aria-label={title}>
        <p className={titleClass}>{title}</p>
        <div
          className={cn(
            "mt-3 flex items-center gap-2 text-sm",
            isDark ? "text-violet-200" : "text-violet-900"
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          불러오는 중…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={shell} data-testid={`${testId}-error`} aria-label={title}>
        <p className={titleClass}>{title}</p>
        <div
          className={cn(
            "mt-3 flex items-start gap-2 text-xs",
            isDark ? "text-rose-200" : "text-rose-700"
          )}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (empty) {
    return (
      <section className={shell} data-testid={`${testId}-empty`} aria-label={title}>
        <p className={titleClass}>{title}</p>
        <p
          className={cn(
            "mt-3 text-xs leading-relaxed",
            isDark ? "text-violet-200/80" : "text-violet-900/70"
          )}
        >
          {emptyMessage}
        </p>
      </section>
    );
  }

  return (
    <section className={shell} data-testid={testId} aria-label={title}>
      <p className={titleClass}>{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
