/**
 * RC5-4 — Pilot Beta operations hub
 */

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Upload, BarChart3, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VISION_PILOT_BETA_CONFIG,
  buildPilotRoute,
  resolvePilotMatchId,
} from "@/lib/vision/visionPilotBetaConfig";
import { summarizePilotOpsLogs } from "@/lib/vision/visionPilotBetaTypes";
import { useVisionPilotOpsLogs, useVisionPilotVocEntries } from "@/hooks/useVisionPilotOpsLogs";
import { VisionJobMonitorPanel } from "@/components/vision/VisionJobMonitorPanel";
import { VisionPilotVocForm } from "@/components/vision/VisionPilotVocForm";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";
import { teamValidationConsolePath } from "@/lib/team/teamValidationConsoleRoutes";

export default function VisionPilotBetaPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const matchId = resolvePilotMatchId(teamId);
  const playerId = VISION_PILOT_BETA_CONFIG.roles.parent.playerId;

  const { logs, loading: logsLoading } = useVisionPilotOpsLogs(teamId);
  const { entries: vocEntries } = useVisionPilotVocEntries(teamId, matchId);
  const summary = summarizePilotOpsLogs(logs);

  const coachVoc = vocEntries.filter((e) => e.persona === "coach");
  const parentVoc = vocEntries.filter((e) => e.persona === "parent");

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-slate-100">
      <header className="border-b border-violet-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to={buildPilotRoute(VISION_PILOT_BETA_CONFIG.routes.coachDashboard, {
              teamId,
              matchId,
            })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Coach Dashboard
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
            RC5-4 Pilot Beta
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
          <h1 className="text-lg font-black text-violet-950">
            {VISION_PILOT_BETA_CONFIG.academy.labelKo}
          </h1>
          <p className="mt-1 text-xs text-violet-800">
            실경기 MP4 업로드 → Queue → Worker → Firestore → Coach / Parent UI 검증
          </p>
          <p className="mt-2 font-mono text-[10px] text-violet-600">
            matchId: {matchId} · preset: {VISION_PILOT_BETA_CONFIG.productionPreset}
          </p>
          <VisionPlatformNav
            teamId={teamId}
            matchId={matchId}
            current="team-hub"
            variant="light"
            className="mt-3"
          />
          <Link
            to={teamValidationConsolePath(teamId, matchId)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-600"
            data-testid="pilot-beta-upload-link"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            실제 MP4 업로드 (Validation Console)
          </Link>
          <Link
            to={`/teams/${encodeURIComponent(teamId)}/vision/ops`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50"
            data-testid="pilot-beta-ops-dashboard-link"
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Operations Dashboard (Read-only)
          </Link>
        </section>

        <VisionJobMonitorPanel teamId={teamId} matchId={matchId} variant="light" />

        <section
          className="rounded-xl border border-violet-200 bg-white p-4"
          data-testid="pilot-beta-ops-summary"
        >
          <h2 className="flex items-center gap-2 text-sm font-black text-violet-950">
            <BarChart3 className="h-4 w-4" aria-hidden />
            운영 로그 요약
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-violet-600">총 실행</dt>
              <dd className="text-lg font-black tabular-nums">{summary.totalRuns}</dd>
            </div>
            <div>
              <dt className="text-violet-600">성공률</dt>
              <dd className="text-lg font-black tabular-nums">{summary.successRate}%</dd>
            </div>
            <div>
              <dt className="text-emerald-700">성공</dt>
              <dd className="text-lg font-black tabular-nums text-emerald-800">
                {summary.successCount}
              </dd>
            </div>
            <div>
              <dt className="text-rose-700">실패</dt>
              <dd className="text-lg font-black tabular-nums text-rose-800">
                {summary.failureCount}
              </dd>
            </div>
          </dl>
          {summary.avgElapsedMs > 0 ? (
            <p className="mt-2 text-[11px] text-violet-700">
              평균 처리 시간: <strong>{Math.round(summary.avgElapsedMs / 1000)}s</strong>
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-violet-100 text-violet-700">
                  <th className="py-1 pr-2">runId</th>
                  <th className="py-1 pr-2">결과</th>
                  <th className="py-1 pr-2">처리(ms)</th>
                  <th className="py-1">원인</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-2 text-violet-600">
                      로그 불러오는 중…
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 text-violet-600">
                      아직 운영 로그가 없습니다. MP4 업로드 후 자동 기록됩니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-violet-50">
                      <td className="py-1.5 pr-2 font-mono text-[10px]">{log.runId.slice(0, 8)}…</td>
                      <td
                        className={cn(
                          "py-1.5 pr-2 font-bold",
                          log.success ? "text-emerald-700" : "text-rose-700"
                        )}
                      >
                        {log.success ? (log.idempotent ? "OK↩" : "OK") : "FAIL"}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">{log.pipelineElapsedMs}</td>
                      <td className="py-1.5 text-rose-800">{log.errorCode ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <VisionPilotVocForm teamId={teamId} matchId={matchId} persona="coach" variant="light" />
          <VisionPilotVocForm
            teamId={teamId}
            matchId={matchId}
            persona="parent"
            playerId={playerId !== "CONFIGURE_AT_OPS" ? playerId : undefined}
            variant="light"
          />
        </div>

        {(coachVoc.length > 0 || parentVoc.length > 0) && (
          <section className="rounded-xl border border-violet-200 bg-white p-4">
            <h2 className="text-sm font-black text-violet-950">VOC 요약</h2>
            <ul className="mt-2 space-y-2 text-xs text-violet-900">
              {[...coachVoc, ...parentVoc].map((v) => (
                <li key={v.id} className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2">
                  <span className="font-bold uppercase">{v.persona}</span> · {"★".repeat(v.rating)}
                  <p className="mt-1">{v.comment}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
