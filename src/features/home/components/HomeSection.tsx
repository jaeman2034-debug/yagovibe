import type { ReactNode } from "react";

type HomeSectionProps = {
  /** 비우면 제목(h2)만 렌더하지 않음 — 리스트 영역은 동일 */
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

export function HomeSection({ title, actionLabel, onAction, children }: HomeSectionProps) {
  const showHeader = Boolean(title) || Boolean(actionLabel && onAction);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {showHeader ? (
        <div
          className={`flex items-center gap-2 border-b border-gray-100 px-4 py-3 ${title ? "justify-between" : "justify-end"}`}
        >
          {title ? <h2 className="text-base font-semibold text-gray-900">{title}</h2> : null}
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}
