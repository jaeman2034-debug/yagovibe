/**
 * 🔥 Empty State 컴포넌트
 * 
 * 역할:
 * - 데이터가 없을 때 표시
 * - 일관된 빈 상태 UI
 */

import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  /** message 와 동일 용도 (호환) */
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 카드형 빈 상태(목록·섹션과 폭·스타일 맞춤) */
  variant?: "plain" | "card";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  description,
  action,
  variant = "plain",
  className,
}: EmptyStateProps) {
  const body = description ?? message;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        variant === "card" &&
          "rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/95",
        variant === "card" && "py-10",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        {icon || <Inbox className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {body && (
        <p className="mb-4 w-full max-w-none text-sm leading-relaxed text-gray-500 md:max-w-md dark:text-gray-400">
          {body}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
