import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CreateFormContainerProps {
  children: ReactNode;
  className?: string;
}

/** 플랫폼 기본: 중앙 정렬 · 넓은 폭(PC). `className`으로 max-w 등 덮어쓰기 가능 (twMerge). */
export function CreateFormContainer({ children, className }: CreateFormContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-3xl mx-auto min-h-[calc(100vh-120px)] px-4 py-6 pb-36 sm:px-6 md:px-8",
        className
      )}
    >
      {children}
    </div>
  );
}

