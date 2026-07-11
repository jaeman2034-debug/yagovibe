/**
 * Pilot Operations Dashboard — read-only (Shadow-10+ gate)
 */

import type { ComponentType } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Upload,
  Activity,
  Eye,
  Zap,
  Users,
  Database,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisionOpsDashboard } from "@/hooks/useVisionOpsDashboard";
import { VISION_PILOT_BETA_CONFIG } from "@/lib/vision/visionPilotBetaConfig";

function MetricCard({
  label,
  value,
  sub,
  accent = "violet",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "violet" | "emerald" | "amber" | "rose";
}) {
  const colors = {
    violet: "border-violet-200 bg-violet-50/80 text-violet-950",
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    amber: "border-amber-200 bg-amber-50/80 text-amber-950",
    rose: "border-rose-200 bg-rose-50/80 text-rose-950",
  };
  return (
    <div className={cn("rounded-xl border p-3", colors[accent])}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] opacity-80">{sub}</p> : null}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  testId,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section
      className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm"
      data-testid={testId}
    >
      <h2 className="flex items-center gap-2 text-sm font-black text-violet-950">
        <Icon className="h-4 w-4" aria-hidden />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 font-medium text-violet-800">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right tabular-nums text-violet-700">{value}</span>
    </div>
  );
}

function GateRow({ id, target, current, pass }: { id: string; target: number; current: number; pass: boolean }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-violet-900">{id}</span>
        <span className={cn("font-bold", pass ? "text-emerald-700" : "text-violet-700")}>
          {current}/{target} {pass ? "✓" : ""}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-violet-100">
        <div
          className={cn("h-full rounded-full", pass ? "bg-emerald-500" : "bg-violet-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function VisionOpsDashboardPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const { data, loading, error, refresh } = useVisionOpsDashboard(teamId);

  const gevDist = data?.gev.distribution ?? {};
  const gevMax = Math.max(1, ...Object.values(gevDist));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-violet-50/40">
      <header className="sticky top-0 z-10 border-b border-violet-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to={`/teams/${encodeURIComponent(teamId)}/vision/pilot-beta`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Pilot Beta
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] font-bold uppercase tracking-wide text-violet-600 sm:inline">
              Read-only · {VISION_PILOT_BETA_CONFIG.productionPreset}
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
              data-testid="ops-dashboard-refresh"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} aria-hidden />
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-violet-950">
              <Activity className="h-5 w-5" aria-hidden />
              Pilot Operations Dashboard
            </h1>
            <p className="mt-1 text-xs text-violet-700">
              {VISION_PILOT_BETA_CONFIG.academy.labelKo} · Firestore 실시간 집계 (읽기 전용)
            </p>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-800"
            data-testid="ops-dashboard-lock-badge"
          >
            <Lock className="h-3 w-3" aria-hidden />
            Vision v2 LOCK · No mutations
          </div>
        </div>

        {error ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            data-testid="ops-dashboard-error"
          >
            데이터를 불러오지 못했습니다: {error}
          </div>
        ) : null}

        {loading && !data ? (
          <p className="text-center text-sm text-violet-600" data-testid="ops-dashboard-loading">
            Firestore 집계 중…
          </p>
        ) : null}

        {data ? (
          <>
            <p className="text-[10px] text-violet-500" data-testid="ops-dashboard-meta">
              수집 {new Date(data.collectedAt).toLocaleString("ko-KR")} · {data.loadMs}ms ·{" "}
              {data.preset}
            </p>

            {/* 1. Pilot Overview */}
            <Section title="Pilot Overview" icon={Upload} testId="ops-section-overview">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="업로드" value={data.overview.uploadCount} />
                <MetricCard
                  label="완료 분석"
                  value={data.overview.completedAnalyses}
                  accent="emerald"
                />
                <MetricCard
                  label="Production 성공률"
                  value={`${data.overview.productionSuccessRate}%`}
                  sub={`raw ${data.overview.rawSuccessRate}%`}
                  accent="emerald"
                />
                <MetricCard
                  label="실패"
                  value={data.overview.failedAnalyses}
                  accent="rose"
                />
              </div>
            </Section>

            {/* 2. Vision Quality */}
            <Section title="Vision Quality" icon={Eye} testId="ops-section-quality">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Avg Readiness"
                  value={data.quality.avgReadiness ?? "—"}
                  sub={`${data.quality.runsWithScore} runs scored`}
                />
                <MetricCard
                  label="GEV Gate Pass"
                  value={
                    data.quality.gevGatePassRate != null
                      ? `${data.quality.gevGatePassRate}%`
                      : "—"
                  }
                />
              </div>
              <div className="mt-3 space-y-1.5">
                {(["A", "B", "C", "D", "F"] as const).map((g) => (
                  <BarRow
                    key={g}
                    label={`Grade ${g}`}
                    value={data.quality.gradeDistribution[g]}
                    max={Math.max(
                      1,
                      ...(["A", "B", "C", "D", "F", "unknown"] as const).map(
                        (k) => data.quality.gradeDistribution[k]
                      )
                    )}
                  />
                ))}
              </div>
            </Section>

            {/* 3. GEV */}
            <Section title="GEV Events" icon={Zap} testId="ops-section-gev">
              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="이벤트 합계" value={data.gev.totalEvents} />
                <MetricCard label="GEV runs" value={data.gev.runsWithEvents} />
                <MetricCard
                  label="Pending Review"
                  value={data.gev.pendingReview}
                  accent={data.gev.pendingReview > 10 ? "amber" : "violet"}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                {Object.keys(gevDist).length === 0 ? (
                  <p className="text-xs text-violet-600">이벤트 분포 없음</p>
                ) : (
                  Object.entries(gevDist)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <BarRow key={k} label={k} value={v} max={gevMax} />
                    ))
                )}
              </div>
            </Section>

            {/* 4. Coach Review */}
            <Section title="Coach Review" icon={Users} testId="ops-section-coach">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <MetricCard label="승인" value={data.coach.approved} accent="emerald" />
                <MetricCard label="반려" value={data.coach.rejected} />
                <MetricCard label="대기" value={data.coach.pending} accent="amber" />
                <MetricCard
                  label="승인율 (검토완료)"
                  value={
                    data.coach.approvalRateReviewed != null
                      ? `${data.coach.approvalRateReviewed}%`
                      : "—"
                  }
                  accent="emerald"
                />
                <MetricCard
                  label="평균 검토 지연"
                  value={
                    data.coach.avgReviewLatencyHours != null
                      ? `${data.coach.avgReviewLatencyHours}h`
                      : "—"
                  }
                  sub="createdAt → reviewedAt"
                />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div>
                  GEV: {data.coach.bySource.gevEventCandidates.approved}승인 /{" "}
                  {data.coach.bySource.gevEventCandidates.pending}대기
                </div>
                <div>
                  CV Runs: {data.coach.bySource.cvRuns.approved}승인 /{" "}
                  {data.coach.bySource.cvRuns.pending}대기
                </div>
                <div>
                  Interpretation: {data.coach.bySource.interpretationCandidates.approved}승인 /{" "}
                  {data.coach.bySource.interpretationCandidates.pending}대기
                </div>
              </div>
            </Section>

            {/* 5. Shadow Dataset */}
            <Section title="Shadow Dataset" icon={Database} testId="ops-section-shadow">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Training Samples"
                  value={data.shadow.approvedSamples}
                  accent="emerald"
                />
                <MetricCard label="Registry" value={data.shadow.registryVersions} />
                <MetricCard
                  label="Latest DS"
                  value={data.shadow.latestDatasetVersion?.slice(-10) ?? "—"}
                  sub={`${data.shadow.latestSampleCount} samples`}
                />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.shadow.gates.map((g) => (
                  <GateRow key={g.id} {...g} />
                ))}
              </div>
            </Section>

            {/* 6. Operations */}
            <Section title="Operations" icon={AlertTriangle} testId="ops-section-ops">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="p95 처리(분)"
                  value={
                    data.operations.p95ProcessingMin != null
                      ? data.operations.p95ProcessingMin.toFixed(1)
                      : "—"
                  }
                />
                <MetricCard
                  label="오류율"
                  value={data.operations.errorRate != null ? `${data.operations.errorRate}%` : "—"}
                  accent="rose"
                />
                <MetricCard
                  label="재시도율"
                  value={data.operations.retryRate != null ? `${data.operations.retryRate}%` : "—"}
                  accent="amber"
                />
                <MetricCard
                  label="운영 실패"
                  value={data.operations.failureBreakdown.operational}
                  sub="KPI 분리"
                  accent="rose"
                />
              </div>
              {data.operations.topIssues.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-violet-900">
                  {data.operations.topIssues.map((issue) => (
                    <li
                      key={issue.label}
                      className="flex justify-between rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2"
                    >
                      <span>{issue.label}</span>
                      <span className="font-bold tabular-nums">{issue.count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>

            {/* Recent runs table */}
            <section
              className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm"
              data-testid="ops-section-recent-runs"
            >
              <h2 className="text-sm font-black text-violet-950">최근 Vision Runs</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-violet-100 text-violet-700">
                      <th className="py-1 pr-2">media</th>
                      <th className="py-1 pr-2">status</th>
                      <th className="py-1 pr-2">GEV</th>
                      <th className="py-1 pr-2">ready</th>
                      <th className="py-1">category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRuns.map((r) => (
                      <tr key={r.runId} className="border-b border-violet-50">
                        <td className="py-1.5 pr-2 font-mono text-[10px]">
                          {r.mediaId.slice(0, 8)}…
                        </td>
                        <td className="py-1.5 pr-2">{r.status}</td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {r.gevEventCount ?? 0} ({r.gevStatus ?? "—"})
                        </td>
                        <td className="py-1.5 pr-2">
                          {r.visionReadinessGrade ?? "—"}
                          {r.visionReadinessScore != null ? ` (${r.visionReadinessScore})` : ""}
                        </td>
                        <td className="py-1.5 text-violet-600">{r.failureCategory ?? "ok"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
