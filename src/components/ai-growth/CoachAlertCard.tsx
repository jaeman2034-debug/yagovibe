import { Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachAlertFeedResult } from "@/lib/ai-growth/coachAlertTypes";

type Props = {
  feed: CoachAlertFeedResult | null;
  loading?: boolean;
  className?: string;
};

function AlertRow({ alert }: { alert: CoachAlertFeedResult["alerts"][number] }) {
  const isWarning = alert.severity === "warning";
  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2",
        isWarning
          ? "border-amber-300 bg-amber-50/90"
          : "border-orange-200 bg-orange-50/80"
      )}
      data-testid={`coach-alert-${alert.id}`}
    >
      <p className="text-sm font-bold text-amber-950">
        <span aria-hidden>{alert.emoji}</span> {alert.title}
      </p>
      <p className="mt-0.5 text-xs text-amber-900">{alert.body}</p>
    </li>
  );
}

/** Sprint E-2.3 — 코치 전용 알림 */
export function CoachAlertCard({ feed, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900",
          className
        )}
        data-testid="coach-alert-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        코치 알림 확인 중…
      </div>
    );
  }

  if (!feed || feed.alerts.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 p-4 shadow-sm",
        className
      )}
      data-testid="coach-alert-card"
      aria-label="코치 알림"
    >
      <h2 className="flex items-center gap-1.5 text-sm font-black text-amber-950">
        <Bell className="h-4 w-4 text-amber-600" aria-hidden />
        {feed.headline}
        <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-900">
          {feed.alerts.length}
        </span>
      </h2>

      <ul className="mt-3 space-y-2" data-testid="coach-alert-list">
        {feed.alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </ul>
    </section>
  );
}
