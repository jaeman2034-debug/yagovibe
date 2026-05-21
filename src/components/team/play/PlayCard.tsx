import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PlayCardKind = "match" | "simulation" | "growth";

type Props = {
  kind: PlayCardKind;
  icon: ReactNode;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  /** 메인 진입 — 시선 링 */
  featured?: boolean;
  disabled?: boolean;
};

export function PlayCard({ icon, title, desc, cta, onClick, featured = false, disabled = false }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-white to-indigo-50/90 p-5 text-left shadow-sm outline-none transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none",
        "hover:border-indigo-400 hover:shadow-md motion-reduce:hover:scale-100 hover:scale-[1.01] motion-reduce:active:scale-100 active:scale-[0.99]",
        "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        featured && "ring-2 ring-indigo-400/85 ring-offset-2 ring-offset-white motion-reduce:ring-indigo-500/90",
        disabled && "pointer-events-none cursor-not-allowed opacity-50"
      )}
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="mt-2 text-base font-bold text-gray-900 group-hover:text-indigo-900">{title}</span>
      <span className="mt-1 text-sm leading-relaxed text-gray-600">{desc}</span>
      <span className="mt-3 inline-flex items-center text-[11px] font-bold uppercase tracking-wide text-indigo-600">
        {cta} →
      </span>
    </button>
  );
}
