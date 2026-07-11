/**
 * RC4-6 M6 — End-to-End pipeline progress display
 */

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { E2EDemoStep, E2EDemoSummary } from "@/lib/vision/e2eDemoTypes";

type Props = {
  summary: E2EDemoSummary;
  variant?: "light" | "dark";
  className?: string;
};

function StepIcon({ status }: { status: E2EDemoStep["status"] }) {
  if (status === "pass") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />;
  }
  if (status === "fail") {
    return <XCircle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />;
  }
  if (status === "running") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-500" aria-hidden />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />;
}

export function VisionE2EPipelineProgress({ summary, variant = "light", className }: Props) {
  const isDark = variant === "dark";
  const passed = summary.steps.filter((s) => s.status === "pass").length;
  const total = summary.steps.length;

  return (
    <section
      className={cn("space-y-3", className)}
      data-testid="vision-e2e-pipeline-progress"
      aria-label="Vision End-to-End 파이프라인"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              isDark ? "text-violet-300" : "text-violet-700"
            )}
          >
            RC4-6 E2E Demo
          </p>
          <h2
            className={cn(
              "text-sm font-black",
              isDark ? "text-white" : "text-violet-950"
            )}
          >
            {summary.verdict === "PASS" ? "Pipeline PASS 🔒" : "Pipeline 검증 중"}
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
            summary.gates.rc4_6_pass
              ? "bg-emerald-600 text-white"
              : isDark
                ? "bg-amber-600/80 text-white"
                : "bg-amber-100 text-amber-950"
          )}
        >
          {passed}/{total}
        </span>
      </div>

      <ol className="space-y-2">
        {summary.steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-2.5",
              isDark
                ? "border-violet-500/25 bg-violet-950/30"
                : "border-violet-100 bg-white"
            )}
            data-testid={`vision-e2e-step-${step.id}`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-bold text-violet-500">
              {index + 1}
            </span>
            <StepIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isDark ? "text-white" : "text-violet-950"
                )}
              >
                {step.label}
              </p>
              {step.detail ? (
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    isDark ? "text-violet-200/80" : "text-violet-800/80"
                  )}
                >
                  {step.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {summary.metrics?.teamFii != null ? (
        <p
          className={cn(
            "text-xs",
            isDark ? "text-violet-200" : "text-violet-800"
          )}
        >
          Team FII <strong className="tabular-nums">{summary.metrics.teamFii}</strong>
          {summary.metrics.gevEvents != null ? (
            <>
              {" "}
              · GEV events <strong>{summary.metrics.gevEvents}</strong>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
