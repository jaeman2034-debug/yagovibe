import { cn } from "@/lib/utils";
import { P1_GLOSSARY_TERM_IDS } from "@/lib/glossary/yagoGlossary";
import { GlossaryTooltip } from "@/components/glossary/GlossaryTooltip";

type Props = {
  className?: string;
  /** 다크 배경(데모) vs 라이트(학부모 카드) */
  variant?: "light" | "dark";
};

/** Sprint P1 — FII · GEV · SCAN · PRESS 한 줄 용어 바 */
export function GlossaryQuickBar({ className, variant = "light" }: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2",
        variant === "dark"
          ? "border-white/15 bg-white/5 text-slate-200"
          : "border-slate-200 bg-slate-50/90 text-slate-700",
        className
      )}
      data-testid="glossary-quick-bar"
      aria-label="용어 설명"
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          variant === "dark" ? "text-violet-200" : "text-slate-500"
        )}
      >
        용어
      </span>
      {P1_GLOSSARY_TERM_IDS.map((termId) => (
        <GlossaryTooltip
          key={termId}
          termId={termId}
          size="sm"
          className={variant === "dark" ? "text-slate-100" : undefined}
        />
      ))}
    </div>
  );
}
