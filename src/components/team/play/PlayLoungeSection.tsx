import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

/** 플레이 라운지 below-fold — 다크 글래스 아코디언 */
export function PlayLoungeSection({ title, summary, defaultOpen = false, children, className }: Props) {
  return (
    <details
      className={cn(
        "group rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm",
        /* overflow-hidden clips position:fixed dialogs when backdrop-filter creates a containing block */
        "overflow-visible",
        className
      )}
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-sm font-bold text-slate-100 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{summary}</span> : null}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-white/10 px-3.5 pb-3.5 pt-2">{children}</div>
    </details>
  );
}
