import { Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParentGrowthRiskAnalysis } from "@/hooks/useParentGrowthRiskAnalysis";
import type { GrowthRiskSignal } from "@/lib/ai-growth/growthRiskTypes";

function RiskRow({ risk }: { risk: GrowthRiskSignal }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        risk.severity === "warning"
          ? "border-amber-300 bg-amber-50/90"
          : "border-orange-200 bg-orange-50/80"
      )}
      data-testid={`parent-growth-risk-${risk.type.toLowerCase()}`}
    >
      <p className="text-sm font-bold text-amber-950">
        <span aria-hidden>{risk.emoji}</span> {risk.title}
      </p>
      <p className="mt-0.5 text-xs text-amber-900">{risk.body}</p>
      {risk.detail ? (
        <p className="mt-1 text-sm font-semibold tabular-nums text-amber-950">{risk.detail}</p>
      ) : null}
    </div>
  );
}

/** Sprint D-5.4-b — Parent Home 성장 위험 분석 카드 */
export function ParentGrowthRiskWarningCard({ className }: { className?: string }) {
  const { data, loading, emptyReason } = useParentGrowthRiskAnalysis();

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900",
          className
        )}
        data-testid="parent-growth-risk-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        성장 위험 분석 중…
      </div>
    );
  }

  if (!data) {
    if (emptyReason === "no_risks") return null;
    return null;
  }

  const { playerName, risks, recommendations, ovrLine } = data;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-orange-50/80 p-4 shadow-sm",
        className
      )}
      data-testid="parent-growth-risk-card"
      aria-label="성장 위험 분석"
    >
      <h2 className="flex items-center gap-1.5 text-lg font-black text-amber-950">
        <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden />
        성장 위험 분석
      </h2>
      <p className="mt-0.5 text-xs text-amber-800">{playerName} 선수</p>

      <ul className="mt-3 space-y-2">
        {risks.map((risk) => (
          <li key={risk.id}>
            <RiskRow risk={risk} />
          </li>
        ))}
      </ul>

      {ovrLine ? (
        <p className="mt-3 text-sm font-bold tabular-nums text-amber-950" data-testid="parent-growth-risk-ovr">
          최근 OVR {ovrLine}
        </p>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2.5" data-testid="parent-growth-risk-recommendations">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800">권장</p>
          <ul className="mt-1.5 space-y-1">
            {recommendations.map((rec) => (
              <li key={rec.id} className="text-sm font-semibold text-violet-950">
                {rec.emoji} {rec.kind === "training_focus" ? rec.detail : rec.title}
                {rec.kind === "badge" ? (
                  <span className="mt-0.5 block text-xs font-normal text-violet-800">
                    {rec.detail.split("\n")[0]}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
