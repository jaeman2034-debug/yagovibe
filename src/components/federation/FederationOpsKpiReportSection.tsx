/**
 * Sprint 3-2 — KPI report section inside Ops Observability (no new dashboard product).
 */

import { useMemo, useState } from "react";
import type { OpsNotificationRow, OpsReservationRow } from "@/lib/federation/opsCenterTypes";
import type { TeamObservabilityDoc } from "@/lib/federation/opsObservability";
import {
  buildOpsKpiReport,
  normalizeTrendBars,
  type OpsKpiTrendPoint,
} from "@/lib/federation/opsKpiReport";

type Props = {
  notifications: OpsNotificationRow[];
  reservations: OpsReservationRow[];
  teams: TeamObservabilityDoc[];
};

function MiniBars({
  label,
  points,
  pick,
  suffix = "",
}: {
  label: string;
  points: OpsKpiTrendPoint[];
  pick: (p: OpsKpiTrendPoint) => number | null;
  suffix?: string;
}) {
  const values = points.map(pick);
  const bars = normalizeTrendBars(values);
  const last = values[values.length - 1];
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h5 className="text-[11px] font-semibold text-gray-700">{label}</h5>
        <span className="text-sm font-semibold tabular-nums text-gray-900">
          {last == null ? "—" : `${last}${suffix}`}
        </span>
      </div>
      <div className="mt-2 flex h-12 items-end gap-0.5" aria-hidden>
        {bars.map((v, i) => (
          <div
            key={points[i]?.day ?? i}
            className="min-w-0 flex-1 rounded-t bg-slate-800/80"
            style={{ height: `${Math.max(6, v * 100)}%` }}
            title={`${points[i]?.day}: ${values[i] ?? "—"}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-gray-400">
        <span>{points[0]?.day?.slice(5) || ""}</span>
        <span>{points[points.length - 1]?.day?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

export function FederationOpsKpiReportSection({
  notifications,
  reservations,
  teams,
}: Props) {
  const [rangeDays, setRangeDays] = useState<7 | 14>(7);

  const report = useMemo(
    () =>
      buildOpsKpiReport({
        notifications,
        reservations,
        teams,
        rangeDays,
        liveSendEnabled: false,
      }),
    [notifications, reservations, teams, rangeDays]
  );

  return (
    <div className="space-y-4 border-t border-slate-100 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-gray-900">운영 KPI 리포트 (Sprint 3-2)</h4>
          <p className="mt-0.5 text-[11px] text-gray-500">
            읽기 전용 집계 · 일/주 추이 · 이상 감지 · 신규 Dashboard 제품 없음
          </p>
        </div>
        <div className="flex gap-1">
          {([7, 14] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRangeDays(d)}
              className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                rangeDays === d
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* Week summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["주간 팀 생성", report.week.teamsCreated],
          ["주간 예약", report.week.reservationsCreated],
          [
            "Branding 성공",
            report.week.brandingSuccessRate == null
              ? "—"
              : `${report.week.brandingSuccessRate}%`,
          ],
          [
            "Public Home",
            report.week.publicHomeReadyRate == null
              ? "—"
              : `${report.week.publicHomeReadyRate}%`,
          ],
          [
            "Dry Run 성공",
            report.week.dryRunSuccessRate == null
              ? "—"
              : `${report.week.dryRunSuccessRate}%`,
          ],
          ["주간 Finalized", report.week.venueFinalized],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border bg-white p-2.5">
            <div className="text-[10px] text-gray-500">{label}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Anomalies */}
      {report.anomalies.length > 0 ? (
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-semibold text-gray-800">운영 이상 감지</h5>
          <ul className="space-y-1.5">
            {report.anomalies.map((a) => (
              <li
                key={a.id}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  a.severity === "critical"
                    ? "border-rose-200 bg-rose-50 text-rose-950"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                <span className="font-semibold">{a.title}</span>
                <span className="mt-0.5 block text-[11px] opacity-90">{a.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-900">
          이상 징후 없음 (Branding 실패 급증 · 알림 실패율 · 예약 급감 기준)
        </p>
      )}

      {/* Trends */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MiniBars
          label="Branding 성공률"
          points={report.trends}
          pick={(p) => p.brandingSuccessRate}
          suffix="%"
        />
        <MiniBars
          label="Public Home 생성률"
          points={report.trends}
          pick={(p) => p.publicHomeReadyRate}
          suffix="%"
        />
        <MiniBars
          label="Dry Run 알림 성공률"
          points={report.trends}
          pick={(p) => p.dryRunSuccessRate}
          suffix="%"
        />
        <MiniBars
          label="예약 수"
          points={report.trends}
          pick={(p) => p.reservations}
        />
        <MiniBars label="팀 생성 수" points={report.trends} pick={(p) => p.teams} />
        <MiniBars
          label="Venue Finalized율"
          points={report.trends}
          pick={(p) => p.venueFinalizedRate}
          suffix="%"
        />
      </div>

      {/* Daily table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[11px]">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="py-1.5 pr-2 font-medium">일자</th>
              <th className="py-1.5 pr-2 font-medium">팀</th>
              <th className="py-1.5 pr-2 font-medium">Brand%</th>
              <th className="py-1.5 pr-2 font-medium">Home%</th>
              <th className="py-1.5 pr-2 font-medium">예약</th>
              <th className="py-1.5 pr-2 font-medium">Final%</th>
              <th className="py-1.5 pr-2 font-medium">DryRun%</th>
              <th className="py-1.5 font-medium">Fail</th>
            </tr>
          </thead>
          <tbody>
            {report.trends.map((t, i) => {
              const b = report.days[i];
              return (
                <tr key={t.day} className="border-b border-gray-50">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{t.day.slice(5)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{t.teams}</td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {t.brandingSuccessRate == null ? "—" : t.brandingSuccessRate}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {t.publicHomeReadyRate == null ? "—" : t.publicHomeReadyRate}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{t.reservations}</td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {t.venueFinalizedRate == null ? "—" : t.venueFinalizedRate}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {t.dryRunSuccessRate == null ? "—" : t.dryRunSuccessRate}
                  </td>
                  <td className="py-1.5 tabular-nums">{b?.notifyFailed ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
