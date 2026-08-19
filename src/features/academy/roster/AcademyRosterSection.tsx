import type { TeamMemberRow } from "@/lib/team/teamMemberRead";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  rows: TeamMemberRow[];
  badgeForRow?: (row: TeamMemberRow) => string | null;
  onBadgeClick?: (row: TeamMemberRow) => void;
  actionsForRow?: (row: TeamMemberRow) => ReactNode;
  emptyLabel?: string;
};

export function AcademyRosterSection({
  title,
  description,
  rows,
  badgeForRow,
  onBadgeClick,
  actionsForRow,
  emptyLabel = "표시할 항목이 없습니다.",
}: Props) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {description ? <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p> : null}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
          {rows.map((row) => {
            const badge = badgeForRow?.(row);
            return (
              <li
                key={row.memberDocumentId}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {row.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {row.role}
                    {row.status !== "active" ? ` · ${row.status}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {badge ? (
                    onBadgeClick ? (
                      <button
                        type="button"
                        onClick={() => onBadgeClick(row)}
                        className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800 underline-offset-2 hover:underline dark:bg-violet-950 dark:text-violet-200"
                      >
                        {badge}
                      </button>
                    ) : (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                        {badge}
                      </span>
                    )
                  ) : null}
                  {actionsForRow?.(row)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
