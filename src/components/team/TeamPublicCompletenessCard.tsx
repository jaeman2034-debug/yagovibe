import { cn } from "@/lib/utils";
import type { PublicHomeCompletenessResult } from "@/lib/team/publicHomeCompleteness";

export type TeamPublicCompletenessCardProps = {
  result: PublicHomeCompletenessResult;
  dark?: boolean;
};

/**
 * Owner-only public home checklist progress (Sprint 2-1).
 */
export function TeamPublicCompletenessCard({ result, dark = false }: TeamPublicCompletenessCardProps) {
  const { score, filled, total, missing } = result;
  const segments = 10;
  const filledSeg = Math.round((score / 100) * segments);

  return (
    <section
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        dark ? "border-slate-600/80 bg-slate-800/40 text-slate-100" : "border-emerald-200/80 bg-white/90 text-gray-900"
      )}
      aria-label="공개 홈 완성도"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>공개 홈 완성도</h3>
        <p className={cn("text-lg font-bold tabular-nums", dark ? "text-emerald-300" : "text-emerald-700")}>
          {score}%
        </p>
      </div>
      <p className={cn("mt-0.5 text-[11px]", dark ? "text-slate-400" : "text-gray-500")}>
        {filled}/{total} 항목 완료 · 방문자가 보는 공개 홈 기준
      </p>

      <div
        className={cn("mt-3 flex gap-0.5", dark ? "text-emerald-400" : "text-emerald-600")}
        role="img"
        aria-label={`완성도 ${score}퍼센트`}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-sm",
              i < filledSeg
                ? dark
                  ? "bg-emerald-400"
                  : "bg-emerald-500"
                : dark
                  ? "bg-slate-700"
                  : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {missing.length > 0 ? (
        <ul className={cn("mt-3 space-y-1.5 text-xs", dark ? "text-slate-300" : "text-gray-700")}>
          {missing.map((m) => (
            <li key={m.id} className="flex gap-2">
              <span className={cn("mt-0.5 shrink-0", dark ? "text-amber-400" : "text-amber-600")} aria-hidden>
                ○
              </span>
              <span>
                <span className="font-medium">{m.label}</span>
                <span className={cn("block text-[11px]", dark ? "text-slate-400" : "text-gray-500")}>{m.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("mt-3 text-xs font-medium", dark ? "text-emerald-300" : "text-emerald-700")}>
          공개 홈 필수 항목을 모두 채웠어요.
        </p>
      )}
    </section>
  );
}
