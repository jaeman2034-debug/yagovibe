import { Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParentGrowthNotifications } from "@/hooks/useParentGrowthNotifications";
import type { ParentGrowthNotificationView } from "@/hooks/useParentGrowthNotifications";

function formatRelativeDay(ms: number): string {
  const diffDays = Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

type NotificationRowProps = {
  item: ParentGrowthNotificationView;
  onMarkRead: (id: string) => void;
};

function CompositeDigestRow({ item, onMarkRead }: NotificationRowProps) {
  const lines = item.digestLines ?? [item.body];

  return (
    <button
      type="button"
      onClick={() => void onMarkRead(item.id)}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
        item.isRead
          ? "border-indigo-200 bg-white/80 opacity-80"
          : "border-indigo-300 bg-indigo-50/90 shadow-sm hover:bg-indigo-100/80"
      )}
      data-testid="parent-growth-notification-weekly_growth_digest"
      data-notification-read={item.isRead ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-indigo-950">
          <span aria-hidden>{item.emoji}</span> {item.title}
        </p>
        {!item.isRead ? (
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="미읽음" />
        ) : null}
      </div>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-indigo-950">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">
        {item.playerName} · {formatRelativeDay(item.occurredAt)}
        {item.weekKey ? ` · ${item.weekKey}` : ""}
        {item.isRead ? " · 읽음" : " · 미읽음"}
      </p>
      <p className="mt-1 text-[10px] text-indigo-600">read-only · J1-2 projection</p>
    </button>
  );
}

function NotificationRow({ item, onMarkRead }: NotificationRowProps) {
  if (item.type === "WEEKLY_GROWTH_DIGEST") {
    return <CompositeDigestRow item={item} onMarkRead={onMarkRead} />;
  }

  return (
    <button
      type="button"
      onClick={() => void onMarkRead(item.id)}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
        item.isRead
          ? "border-slate-200 bg-white/80 opacity-80"
          : "border-violet-300 bg-violet-50/90 shadow-sm hover:bg-violet-100/80"
      )}
      data-testid={`parent-growth-notification-${item.type.toLowerCase()}`}
      data-notification-read={item.isRead ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          <span aria-hidden>{item.emoji}</span> {item.body}
        </p>
        {!item.isRead ? (
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-violet-600" aria-label="미읽음" />
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {item.playerName} · {formatRelativeDay(item.occurredAt)}
        {item.isRead ? " · 읽음" : " · 미읽음"}
      </p>
    </button>
  );
}

/** Sprint D-5.2-b / J1-2a — Parent Home 상단 성장 알림 피드 */
export function ParentGrowthNotificationFeed({ className }: { className?: string }) {
  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useParentGrowthNotifications();

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500",
          className
        )}
        data-testid="parent-growth-notification-feed-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        성장 알림 불러오는 중…
      </div>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/80 to-white p-4 shadow-sm",
        className
      )}
      data-testid="parent-growth-notification-feed"
      aria-label="성장 알림"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-violet-950">
          <Bell className="h-4 w-4 text-violet-600" aria-hidden />
          성장 알림
          {unreadCount > 0 ? (
            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white">
              {unreadCount}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>최근 7일</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="font-semibold text-violet-700 underline underline-offset-2"
              data-testid="parent-growth-notification-mark-all-read"
            >
              모두 읽음
            </button>
          ) : null}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {notifications.map((item) => (
          <li key={item.id}>
            <NotificationRow item={item} onMarkRead={(id) => void markRead(id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
