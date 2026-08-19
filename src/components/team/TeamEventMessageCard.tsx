/**
 * 공개 팀 허브 — 행사 안내 카드
 */
import { cn } from "@/lib/utils";

export type TeamEventMessageCardProps = {
  eventMessage: string;
  dark?: boolean;
};

export function TeamEventMessageCard({ eventMessage, dark = false }: TeamEventMessageCardProps) {
  const text = eventMessage.trim();
  if (!text) return null;

  return (
    <section
      className={cn(
        "rounded-lg border px-4 py-3 sm:px-5 sm:py-4",
        dark
          ? "border-slate-600/80 bg-slate-800/50 text-slate-100"
          : "border-slate-200 bg-slate-50 text-slate-800"
      )}
      aria-label="행사 안내"
    >
      <h3
        className={cn(
          "text-sm font-semibold tracking-tight",
          dark ? "text-slate-100" : "text-gray-900"
        )}
      >
        행사 안내
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed sm:text-base">{text}</p>
    </section>
  );
}
