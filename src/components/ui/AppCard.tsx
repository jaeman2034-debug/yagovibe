import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** 리스트·요약·설정 등 공통 카드 스킨 (border 기반 flat) */
export function AppCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-none dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-100",
        className
      )}
      {...props}
    />
  );
}
