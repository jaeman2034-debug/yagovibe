import { ListChecks, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachActionCenterResult } from "@/lib/ai-growth/coachActionCenterTypes";

type Props = {
  center: CoachActionCenterResult | null;
  loading?: boolean;
  className?: string;
};

function ActionRow({
  index,
  action,
}: {
  index: number;
  action: CoachActionCenterResult["actions"][number];
}) {
  return (
    <li
      className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-2.5"
      data-testid={`coach-action-${action.id}`}
    >
      <p className="text-sm font-bold text-emerald-950">
        <span className="mr-1.5 tabular-nums text-emerald-700">{index}.</span>
        <span aria-hidden>{action.emoji}</span> {action.title}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-emerald-900">{action.detail}</p>
    </li>
  );
}

/** Sprint E-2.1 — 오늘 우선 코칭 (Coach Action Center) */
export function CoachActionCenterCard({ center, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900",
          className
        )}
        data-testid="coach-action-center-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        코칭 우선순위 분석 중…
      </div>
    );
  }

  if (!center) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-lime-50/80 p-4 shadow-sm",
        className
      )}
      data-testid="coach-action-center-card"
      aria-label="오늘 우선 코칭"
    >
      <div>
        <h2 className="flex items-center gap-1.5 text-base font-black text-emerald-950">
          <ListChecks className="h-4 w-4 text-emerald-600" aria-hidden />
          {center.headline}
        </h2>
        {center.subline ? (
          <p className="mt-0.5 text-[11px] text-emerald-800">{center.subline}</p>
        ) : null}
      </div>

      {center.actions.length > 0 ? (
        <ol className="mt-3 space-y-2" data-testid="coach-action-center-list">
          {center.actions.map((action, index) => (
            <ActionRow key={action.id} index={index + 1} action={action} />
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-emerald-900">추적 데이터가 쌓이면 우선 코칭이 표시됩니다.</p>
      )}
    </section>
  );
}
