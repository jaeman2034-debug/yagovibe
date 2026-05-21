import type { FeeReminderConversionKpiResult } from "../utils/feeReminderConversionKpi";
import { FEE_REMINDER_CONVERSION_WINDOW_DAYS } from "../utils/feeReminderConversionKpi";

type Props = {
  loading: boolean;
  error: string | null;
  reminderRowCount: number;
  dataSource: "server" | "client";
  kpi: FeeReminderConversionKpiResult | null;
};

function fmtPct(n: number) {
  return `${n}%`;
}

function fmtHours(h: number | null) {
  if (h == null) return "—";
  if (h >= 48) return `${Math.round((h / 24) * 10) / 10}일`;
  return `${h}시간`;
}

function cell(s: { notified: number; converted: number; rate: number; avg: number | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center">
      <p className="text-[10px] font-medium text-slate-500">발송 {s.notified}명</p>
      <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-900">
        전환 {s.converted} · {fmtPct(s.rate)}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-600">평균 {fmtHours(s.avg)}</p>
    </div>
  );
}

/** 마감 전 알림(`fee_due_reminder`) → 결제 전환 요약 */
export default function FeeReminderConversionKpiPanel({
  loading,
  error,
  reminderRowCount,
  dataSource,
  kpi,
}: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-[11px] text-rose-900">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
        알림→결제 전환 지표 불러오는 중…
      </div>
    );
  }

  if (!kpi || (reminderRowCount === 0 && dataSource === "client")) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-600">
        아직 이 회차에 대한 <strong>마감 전 알림</strong>(D-3/D-1/D-0) 이력이 없습니다. 스케줄 발송 후 여기에 전환율이
        쌓입니다.
      </div>
    );
  }

  const { byPhase, attributedWithinWindow } = kpi;
  const sourceLabel = dataSource === "server" ? "서버 집계" : "실시간(클라이언트)";

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-[11px] font-semibold text-indigo-950">알림 → 결제 전환 (이 회차)</p>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-indigo-800 ring-1 ring-indigo-200">
          {sourceLabel}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-indigo-900/85">
        전환 정의: <strong>paidAt 직전</strong> 가장 늦은{" "}
        <code className="rounded bg-white/80 px-0.5">fee_due_reminder</code> 1건을 기준으로 하고, 그 시점부터 결제까지{" "}
        <strong>{FEE_REMINDER_CONVERSION_WINDOW_DAYS}일 이내</strong>만 전환으로 잡습니다. phase별 숫자는 해당 phase
        알림을 받은 인원 중, 최종 전환이 그 phase에 귀속된 경우만 집계합니다.
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div>
          <p className="mb-0.5 text-center text-[10px] font-bold text-indigo-900">D-3</p>
          {cell({
            notified: byPhase.d3.notifiedUnique,
            converted: byPhase.d3.convertedUnique,
            rate: byPhase.d3.conversionRatePct,
            avg: byPhase.d3.avgHoursToPay,
          })}
        </div>
        <div>
          <p className="mb-0.5 text-center text-[10px] font-bold text-indigo-900">D-1</p>
          {cell({
            notified: byPhase.d1.notifiedUnique,
            converted: byPhase.d1.convertedUnique,
            rate: byPhase.d1.conversionRatePct,
            avg: byPhase.d1.avgHoursToPay,
          })}
        </div>
        <div>
          <p className="mb-0.5 text-center text-[10px] font-bold text-indigo-900">D-0</p>
          {cell({
            notified: byPhase.d0.notifiedUnique,
            converted: byPhase.d0.convertedUnique,
            rate: byPhase.d0.conversionRatePct,
            avg: byPhase.d0.avgHoursToPay,
          })}
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-indigo-200/80 bg-white/70 px-2 py-1.5 text-[10px] text-indigo-950">
        <strong>알림 수신 후 {FEE_REMINDER_CONVERSION_WINDOW_DAYS}일 이내 결제</strong> (직전 알림 기준): 발송{" "}
        {attributedWithinWindow.notifiedUnique}명 → 전환 {attributedWithinWindow.convertedUnique}명 (
        {fmtPct(attributedWithinWindow.conversionRatePct)}), 평균 {fmtHours(attributedWithinWindow.avgHoursToPay)}
      </div>
    </div>
  );
}
