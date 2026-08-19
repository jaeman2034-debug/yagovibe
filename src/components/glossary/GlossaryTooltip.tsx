import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getGlossaryEntry,
  type YagoGlossaryTermId,
} from "@/lib/glossary/yagoGlossary";

type Props = {
  termId: YagoGlossaryTermId;
  /** 표시 라벨 override (기본: glossary label) */
  label?: string;
  className?: string;
  /** PDF 각주 스타일 — FII* */
  showAsterisk?: boolean;
  /** 버튼 크기 */
  size?: "sm" | "md";
};

/** Sprint P1-1 — 용어 ⓘ 클릭 → 설명 카드 (P1-2 예시 포함) */
export function GlossaryTooltip({
  termId,
  label,
  className,
  showAsterisk = false,
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const entry = getGlossaryEntry(termId);
  const displayLabel = label ?? entry.label;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <>
      <span className={cn("inline-flex items-center gap-0.5", className)}>
        <span className={cn("font-semibold", textSize)}>
          {displayLabel}
          {showAsterisk ? "*" : null}
        </span>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
            size === "md" ? "h-6 w-6" : "h-5 w-5"
          )}
          aria-label={`${displayLabel} 설명 보기`}
          data-testid={`glossary-tooltip-${termId.toLowerCase()}`}
          onClick={() => setOpen(true)}
        >
          <CircleHelp className={iconSize} aria-hidden />
        </button>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="glossary-dialog">
          <DialogHeader>
            <DialogTitle className="text-left text-base font-black text-slate-900">
              {entry.label}
              {entry.fullName !== entry.label ? (
                <span className="mt-1 block text-sm font-semibold text-indigo-700">
                  {entry.fullName}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-left">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {entry.body}
            </p>
            {entry.example ? (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                  예시
                </p>
                <p className="mt-1 text-sm font-bold text-indigo-950">{entry.example.headline}</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-indigo-900">
                  {entry.example.body}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
