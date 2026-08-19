/**
 * Sprint 3-1 — Ops Observability UI (existing Admin / Ops Center only).
 */

import { useMemo } from "react";
import type { OpsNotificationRow, OpsReservationRow } from "@/lib/federation/opsCenterTypes";
import type { OpsProviderLog } from "@/lib/federation/opsProviderLogTypes";
import {
  OPS_QUEUE_MONITOR_STATUSES,
  buildOpsObservabilityCards,
  buildTeamCreationTimeline,
  buildVenueOpsTimelineFromReservation,
  opsQueueMonitorLabel,
  resolveOpsQueueMonitorStatus,
  type TeamObservabilityDoc,
} from "@/lib/federation/opsObservability";
import {
  formatChangeLogType,
  type OpsVenueLogRow,
} from "@/lib/federation/opsObservabilityService";
import { formatOpsTime } from "@/lib/federation/opsCenterService";
import { FederationOpsKpiReportSection } from "@/components/federation/FederationOpsKpiReportSection";

type Props = {
  notifications: OpsNotificationRow[];
  reservations: OpsReservationRow[];
  teams: TeamObservabilityDoc[];
  venueLogs: OpsVenueLogRow[];
  providerLogs: OpsProviderLog[];
};

function TimelineChips({
  steps,
}: {
  steps: Array<{ id: string; label: string; done: boolean; current: boolean }>;
}) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="진행 단계">
      {steps.map((s) => (
        <li
          key={s.id}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            s.done
              ? s.current
                ? "bg-slate-900 text-white"
                : "bg-emerald-100 text-emerald-900"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {s.label}
        </li>
      ))}
    </ol>
  );
}

export function FederationOpsObservabilityPanel({
  notifications,
  reservations,
  teams,
  venueLogs,
  providerLogs,
}: Props) {
  const cards = useMemo(
    () =>
      buildOpsObservabilityCards({
        notifications,
        reservations,
        teams,
        providerLogs,
        liveSendEnabled: false,
      }),
    [notifications, reservations, teams, providerLogs]
  );

  const queueRows = useMemo(() => {
    return notifications.slice(0, 30).map((n) => ({
      row: n,
      status: resolveOpsQueueMonitorStatus(n, { liveSendEnabled: false }),
    }));
  }, [notifications]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">운영 관측 · KPI (Sprint 3-1 / 3-2)</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          기존 데이터 읽기 전용 · liveSendEnabled=false · 신규 Admin/Dashboard 제품 없음
        </p>
      </div>

      <FederationOpsKpiReportSection
        notifications={notifications}
        reservations={reservations}
        teams={teams}
      />

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["오늘 생성 팀", cards.teamsToday],
          ["오늘 예약", cards.reservationsToday],
          ["Dry Run 알림", cards.dryRunNotifications],
          [
            "Branding 성공률",
            cards.brandingSuccessRate == null ? "—" : `${cards.brandingSuccessRate}%`,
          ],
          [
            "Public Home 준비율",
            cards.publicHomeReadyRate == null ? "—" : `${cards.publicHomeReadyRate}%`,
          ],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <div className="text-[11px] text-gray-500">{label}</div>
            <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Queue status counts */}
      <div>
        <h4 className="text-xs font-semibold text-gray-800">Notification Queue</h4>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
          {OPS_QUEUE_MONITOR_STATUSES.map((s) => (
            <div key={s} className="rounded border border-slate-100 px-2 py-1.5 text-center">
              <div className="text-[10px] text-gray-500">{opsQueueMonitorLabel(s)}</div>
              <div className="text-sm font-semibold tabular-nums text-gray-900">
                {cards.queueCounts[s]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue monitor table */}
      <div>
        <h4 className="text-xs font-semibold text-gray-800">
          Queue Monitor (최근 {queueRows.length})
        </h4>
        {queueRows.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">알림 큐 항목이 없습니다.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-left text-[11px]">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-1.5 pr-2 font-medium">시간</th>
                  <th className="py-1.5 pr-2 font-medium">상태</th>
                  <th className="py-1.5 pr-2 font-medium">종류</th>
                  <th className="py-1.5 pr-2 font-medium">팀</th>
                  <th className="py-1.5 font-medium">재시도</th>
                </tr>
              </thead>
              <tbody>
                {queueRows.map(({ row, status }) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {formatOpsTime(row.createdAt)}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span
                        className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                          status === "dry_run"
                            ? "border-amber-200 bg-amber-50 text-amber-900"
                            : status === "failed" || status === "dead_letter"
                              ? "border-rose-200 bg-rose-50 text-rose-800"
                              : status === "retrying"
                                ? "border-violet-200 bg-violet-50 text-violet-900"
                                : "border-slate-200 bg-slate-50 text-slate-800"
                        }`}
                      >
                        {opsQueueMonitorLabel(status)}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2">{row.kind}</td>
                    <td className="py-1.5 pr-2 max-w-[8rem] truncate">{row.teamName}</td>
                    <td className="py-1.5 tabular-nums">{row.retryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Venue timelines */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold text-gray-800">
            Venue Timeline (최근 예약 {Math.min(8, reservations.length)})
          </h4>
          {reservations.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">예약이 없습니다.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {reservations.slice(0, 8).map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1 text-xs">
                    <span className="font-medium text-gray-900">
                      {r.shortReservationCode || r.id.slice(0, 8)} · {r.teamName}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {r.bookingDate} {r.startTime}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <TimelineChips steps={buildVenueOpsTimelineFromReservation(r)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {venueLogs.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Change log feed
              </p>
              <ul className="mt-1 max-h-40 space-y-1 overflow-auto text-[11px] text-gray-700">
                {venueLogs.slice(0, 15).map((l) => (
                  <li key={l.id} className="flex gap-2 border-b border-slate-50 py-1">
                    <span className="shrink-0 text-gray-400">{formatOpsTime(l.at)}</span>
                    <span className="font-medium">{formatChangeLogType(l.changeType)}</span>
                    <span className="truncate text-gray-500">
                      {l.bookingDate} {l.startTime}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-800">
            Team Creation Timeline ({Math.min(8, teams.length)})
          </h4>
          {teams.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">
              협회에 연결된 platform 팀이 없습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {teams.slice(0, 8).map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="text-xs font-medium text-gray-900">
                    {t.name || t.id}
                    {t.slug ? (
                      <span className="ml-1 font-mono text-[10px] text-slate-500">/{t.slug}</span>
                    ) : null}
                  </div>
                  <div className="mt-1.5">
                    <TimelineChips steps={buildTeamCreationTimeline(t)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
