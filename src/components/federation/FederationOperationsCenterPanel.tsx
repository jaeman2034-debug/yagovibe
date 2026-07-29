/**
 * PR4 Sprint C — Federation Operations Center (queue / delivery / retry).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOpsDashboardStats,
  formatOpsPhone,
  formatOpsTime,
  listFederationOpsNotifications,
  listFederationOpsProviderLogs,
  listFederationOpsReservations,
  opsDeliveryLabel,
  opsKindLabel,
  opsRoleLabel,
  opsStatusLabel,
  runConsumeQueuedSms,
  runRetryFailedNotifications,
} from "@/lib/federation/opsCenterService";
import type {
  OpsCenterTabId,
  OpsDeliveryFilter,
  OpsMessageKind,
  OpsNotificationRow,
  OpsReservationRow,
  OpsSmsStatus,
} from "@/lib/federation/opsCenterTypes";
import type { OpsProviderLog } from "@/lib/federation/opsProviderLogTypes";
import { getOpsSmsProvider } from "@/lib/notifications/opsSmsProvider";
import { resolveSmsProviderMode } from "@/lib/notifications/smsProviderConfig";
import { getNotificationProviderFactory } from "@/lib/notifications/notificationProviderFactory";

type Props = {
  federationSlug: string;
};

const NAV: { id: OpsCenterTabId; label: string }[] = [
  { id: "reservations", label: "예약 현황" },
  { id: "sms-queue", label: "문자 발송" },
  { id: "history", label: "발송 이력" },
  { id: "failures", label: "실패 목록" },
  { id: "stats", label: "통계" },
];

function StatusBadge({
  status,
  deliveryStatus,
}: {
  status: OpsSmsStatus;
  deliveryStatus?: OpsDeliveryFilter | "other";
}) {
  const label = deliveryStatus
    ? opsDeliveryLabel(deliveryStatus)
    : opsStatusLabel(status);
  const key = deliveryStatus || status;
  const cls =
    key === "delivered" || key === "sms_sent"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : key === "failed" || key === "sms_failed"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : key === "sending"
          ? "bg-sky-50 text-sky-900 border-sky-200"
          : key === "retry"
            ? "bg-violet-50 text-violet-900 border-violet-200"
            : key === "queued" || key === "queued_sms_pending"
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export function FederationOperationsCenterPanel({ federationSlug }: Props) {
  const provider = getOpsSmsProvider();
  const providerMode = resolveSmsProviderMode();
  const outbound = getNotificationProviderFactory();
  const kakaoStatus = outbound.kakaoStatus;
  const [subTab, setSubTab] = useState<OpsCenterTabId>("stats");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<OpsNotificationRow[]>([]);
  const [reservations, setReservations] = useState<OpsReservationRow[]>([]);
  const [providerLogs, setProviderLogs] = useState<OpsProviderLog[]>([]);
  const [teamFilter, setTeamFilter] = useState("");
  const [kindFilter, setKindFilter] = useState<OpsMessageKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<OpsDeliveryFilter | "all">("all");
  const [detail, setDetail] = useState<OpsNotificationRow | null>(null);
  const [stubMsg, setStubMsg] = useState<string | null>(null);
  const [consumeBusy, setConsumeBusy] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [n, r, logs] = await Promise.all([
        listFederationOpsNotifications(federationSlug, { max: 200 }),
        listFederationOpsReservations(federationSlug, 80),
        listFederationOpsProviderLogs(federationSlug, 40),
      ]);
      setNotifs(n);
      setReservations(r);
      setProviderLogs(logs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "운영센터 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [federationSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => buildOpsDashboardStats(notifs), [notifs]);

  const filteredHistory = useMemo(() => {
    const q = teamFilter.trim().toLowerCase();
    return notifs.filter((n) => {
      if (q && !n.teamName.toLowerCase().includes(q)) return false;
      if (kindFilter !== "all" && n.kind !== kindFilter) return false;
      if (statusFilter !== "all" && n.deliveryStatus !== statusFilter) return false;
      return true;
    });
  }, [notifs, teamFilter, kindFilter, statusFilter]);

  const pendingSms = useMemo(
    () =>
      notifs.filter(
        (n) =>
          n.status === "queued_sms_pending" ||
          n.deliveryStatus === "queued" ||
          n.deliveryStatus === "retry"
      ),
    [notifs]
  );
  const failures = useMemo(
    () =>
      notifs.filter(
        (n) => n.status === "sms_failed" || n.deliveryStatus === "failed"
      ),
    [notifs]
  );

  async function runStubDryRun(row: OpsNotificationRow) {
    setStubMsg(null);
    const result = await provider.send({
      notificationId: row.id,
      toPhone: row.recipientPhone || "",
      body: row.body || row.message,
      federationSlug,
      templateKey: row.kind,
    });
    if (result.ok) {
      setStubMsg(
        `Stub dry-run 성공 · ${result.provider} · ${result.providerMessageId} (실발송 없음)`
      );
    } else {
      setStubMsg(`Stub 실패 · ${result.errorCode}: ${result.errorMessage}`);
    }
  }

  async function runConsumeQueue() {
    setConsumeBusy(true);
    setStubMsg(null);
    try {
      const res = await runConsumeQueuedSms({
        federationSlug,
        limit: 10,
      });
      setStubMsg(
        `consumeQueuedSms · mode=${res.providerMode} · processed=${res.processed}` +
          (res.providerMode === "sms" || res.providerMode === "kakao"
            ? ""
            : " (stub dry-run)")
      );
      await reload();
    } catch (e: unknown) {
      setStubMsg(e instanceof Error ? e.message : "consumeQueuedSms 실패");
    } finally {
      setConsumeBusy(false);
    }
  }

  async function runRetry(notificationId?: string) {
    setRetryBusy(true);
    setStubMsg(null);
    try {
      const res = await runRetryFailedNotifications({
        federationSlug,
        notificationId,
        bulk: !notificationId,
        limit: 20,
      });
      setStubMsg(`retry · processed=${res.processed}`);
      await reload();
    } catch (e: unknown) {
      setStubMsg(e instanceof Error ? e.message : "재발송 실패");
    } finally {
      setRetryBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">운영센터</h2>
          <p className="text-sm text-gray-600">
            예약·문자/알림톡·발송 이력·실패·재시도를 한곳에서 관리합니다. (Sprint C)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            SMS_PROVIDER={providerMode} · {provider.displayName}
            {provider.isStub ? " · 실발송 OFF" : " · CF 발송"}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              kakaoStatus.approvalStatus === "Pending"
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-emerald-300 bg-emerald-50 text-emerald-950"
            }`}
          >
            Kakao · {kakaoStatus.approvalStatus} · NOTIFICATION_PROVIDER=
            {outbound.mode}→{outbound.resolved}
          </span>
          <button
            type="button"
            disabled={consumeBusy}
            onClick={() => void runConsumeQueue()}
            className="rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-950 disabled:opacity-50"
          >
            {consumeBusy ? "처리 중…" : "대기 큐 소비(CF)"}
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800"
          >
            새로고침
          </button>
        </div>
      </div>

      {stubMsg && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          {stubMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-40 lg:flex-col">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap ${
                subTab === item.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-4">
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중…</p>
          ) : (
            <>
              {subTab === "stats" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-amber-950">Kakao Status</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                          kakaoStatus.approvalStatus === "Pending"
                            ? "border-amber-500 bg-white text-amber-900"
                            : "border-emerald-600 bg-white text-emerald-900"
                        }`}
                      >
                        {kakaoStatus.approvalStatus}
                      </span>
                    </div>
                    <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-xs text-amber-950">
                      <dt className="text-amber-800">Channel</dt>
                      <dd>{kakaoStatus.channelIdMasked || "— (미설정)"}</dd>
                      <dt className="text-amber-800">SenderKey</dt>
                      <dd>{kakaoStatus.hasSenderKey ? "[SET]" : "— (Pending)"}</dd>
                      <dt className="text-amber-800">API Key</dt>
                      <dd>{kakaoStatus.hasApiKey ? "[SET]" : "— (Pending)"}</dd>
                      <dt className="text-amber-800">승인 상태</dt>
                      <dd>비즈니스 심사 {kakaoStatus.approvalStatus}</dd>
                      <dt className="text-amber-800">Templates</dt>
                      <dd>
                        {kakaoStatus.templates.length}개 · PENDING{" "}
                        {kakaoStatus.pendingTemplateCount}개
                      </dd>
                    </dl>
                    <ul className="divide-y rounded-lg border border-amber-100 bg-white text-xs">
                      {kakaoStatus.templates.map((t) => (
                        <li key={t.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                          <span className="font-medium text-gray-900">
                            {t.templateName}{" "}
                            <span className="text-gray-500">({t.id})</span>
                          </span>
                          <span className="font-mono text-amber-800">{t.templateCode}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-amber-900/80">
                      심사 승인 후 Channel / SenderKey / Template Code만 채우면 Queue → Factory →
                      Kakao로 전환됩니다. 실 API 호출은 아직 없습니다.
                    </p>
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900">오늘</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      ["발송요청", stats.todayTotal],
                      ["Queued", stats.todayPendingSms],
                      ["Sending", stats.todaySending],
                      ["앱대기", stats.todayQueued],
                      ["성공", stats.todaySent],
                      ["실패", stats.todayFailed],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-lg border bg-slate-50 p-3">
                        <div className="text-[11px] text-gray-500">{label}</div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
                      </div>
                    ))}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">이번 달</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      ["전체", stats.monthTotal],
                      ["문자성공", stats.monthSent],
                      ["실패", stats.monthFailed],
                      ["성공률", stats.successRate == null ? "—" : `${stats.successRate}%`],
                      ["예약배정", stats.monthAssigned],
                      ["예약확정", stats.monthConfirmed],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-lg border p-3">
                        <div className="text-[11px] text-gray-500">{label}</div>
                        <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Live Kakao/SENS 자격증명 연결 후 자동 발송됩니다. Retry: 오늘{" "}
                    {stats.todayRetry}건
                  </p>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Provider 로그 (최근 {providerLogs.length})
                    </h3>
                    {providerLogs.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        아직 없음 · 「대기 큐 소비(CF)」로 stub 로그를 남길 수 있습니다.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-[11px]">
                          <thead className="border-b text-gray-500">
                            <tr>
                              <th className="py-1.5 pr-2 font-medium">시간</th>
                              <th className="py-1.5 pr-2 font-medium">Mode</th>
                              <th className="py-1.5 pr-2 font-medium">전화</th>
                              <th className="py-1.5 pr-2 font-medium">Latency</th>
                              <th className="py-1.5 pr-2 font-medium">HTTP</th>
                              <th className="py-1.5 pr-2 font-medium">Msg ID</th>
                              <th className="py-1.5 font-medium">결과</th>
                            </tr>
                          </thead>
                          <tbody>
                            {providerLogs.map((l) => (
                              <tr key={l.id} className="border-b border-gray-50">
                                <td className="py-1.5 pr-2 whitespace-nowrap">
                                  {formatOpsTime(l.createdAt || l.requestAt)}
                                </td>
                                <td className="py-1.5 pr-2">
                                  {l.providerMode}
                                  {l.dryRun ? "·dry" : ""}
                                </td>
                                <td className="py-1.5 pr-2">{l.toPhoneMasked || "—"}</td>
                                <td className="py-1.5 pr-2">
                                  {l.latencyMs != null ? `${l.latencyMs}ms` : "—"}
                                </td>
                                <td className="py-1.5 pr-2">{l.httpStatus ?? "—"}</td>
                                <td className="py-1.5 pr-2 font-mono max-w-[8rem] truncate">
                                  {l.providerMessageId || "—"}
                                </td>
                                <td className="py-1.5">
                                  {l.ok ? "OK" : l.errorCode || "FAIL"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {subTab === "reservations" && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    최근 예약 ({reservations.length})
                  </h3>
                  {reservations.length === 0 ? (
                    <p className="text-sm text-gray-500">예약이 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b text-gray-500">
                          <tr>
                            <th className="py-2 pr-3 font-medium">코드</th>
                            <th className="py-2 pr-3 font-medium">팀</th>
                            <th className="py-2 pr-3 font-medium">구장</th>
                            <th className="py-2 pr-3 font-medium">일시</th>
                            <th className="py-2 pr-3 font-medium">결제</th>
                            <th className="py-2 font-medium">확정</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reservations.map((r) => (
                            <tr key={r.id} className="border-b border-gray-50">
                              <td className="py-2 pr-3 font-mono">{r.shortReservationCode || r.id.slice(0, 8)}</td>
                              <td className="py-2 pr-3">
                                {r.teamName}
                                {r.teamKind === "guest" ? (
                                  <span className="ml-1 text-[10px] text-amber-700">비가입</span>
                                ) : null}
                              </td>
                              <td className="py-2 pr-3">{r.venueName}</td>
                              <td className="py-2 pr-3">
                                {r.bookingDate} {r.startTime}–{r.endTime}
                              </td>
                              <td className="py-2 pr-3">{r.paymentStatus}</td>
                              <td className="py-2">{r.confirmStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {subTab === "sms-queue" && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      문자 대기 큐 ({pendingSms.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      `queued_sms_pending` · Live 설정 시 자동 발송 · 수동 소비도 가능
                    </p>
                  </div>
                  {pendingSms.length === 0 ? (
                    <p className="text-sm text-gray-500">대기 중인 문자가 없습니다.</p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {pendingSms.map((n) => (
                        <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">
                              {n.teamName} · {opsRoleLabel(n.recipientRole)} ·{" "}
                              {opsKindLabel(n.kind)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatOpsPhone(n.recipientPhone)} · {formatOpsTime(n.createdAt)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setDetail(n)}
                              className="rounded border px-2 py-1 text-xs"
                            >
                              상세
                            </button>
                            <button
                              type="button"
                              onClick={() => void runStubDryRun(n)}
                              className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                            >
                              Stub 테스트
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {subTab === "history" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="rounded-lg border px-2 py-1.5 text-xs"
                      placeholder="팀명"
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                    />
                    <select
                      className="rounded-lg border px-2 py-1.5 text-xs"
                      value={kindFilter}
                      onChange={(e) => setKindFilter(e.target.value as OpsMessageKind | "all")}
                    >
                      <option value="all">유형 전체</option>
                      <option value="RESERVATION_ASSIGNED">예약배정</option>
                      <option value="PAYMENT_APPROVED">입금확인</option>
                      <option value="RESERVATION_CONFIRMED">예약확정</option>
                      <option value="AI_REPORT_READY">AI리포트</option>
                    </select>
                    <select
                      className="rounded-lg border px-2 py-1.5 text-xs"
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as OpsDeliveryFilter | "all")
                      }
                    >
                      <option value="all">상태 전체</option>
                      <option value="queued">Queued</option>
                      <option value="sending">Sending</option>
                      <option value="delivered">Delivered</option>
                      <option value="failed">Failed</option>
                      <option value="retry">Retry</option>
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b text-gray-500">
                        <tr>
                          <th className="py-2 pr-2 font-medium">시간</th>
                          <th className="py-2 pr-2 font-medium">팀</th>
                          <th className="py-2 pr-2 font-medium">대상</th>
                          <th className="py-2 pr-2 font-medium">전화</th>
                          <th className="py-2 pr-2 font-medium">유형</th>
                          <th className="py-2 pr-2 font-medium">상태</th>
                          <th className="py-2 pr-2 font-medium">Provider</th>
                          <th className="py-2 font-medium">기능</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((n) => (
                          <tr key={n.id} className="border-b border-gray-50">
                            <td className="py-2 pr-2 whitespace-nowrap">{formatOpsTime(n.createdAt)}</td>
                            <td className="py-2 pr-2">{n.teamName}</td>
                            <td className="py-2 pr-2">{opsRoleLabel(n.recipientRole)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{formatOpsPhone(n.recipientPhone)}</td>
                            <td className="py-2 pr-2">{opsKindLabel(n.kind)}</td>
                            <td className="py-2 pr-2">
                              <StatusBadge
                                status={n.status}
                                deliveryStatus={n.deliveryStatus}
                              />
                            </td>
                            <td className="py-2 pr-2">{n.provider || "—"}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-sky-800 underline"
                                onClick={() => setDetail(n)}
                              >
                                상세
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredHistory.length === 0 && (
                      <p className="py-4 text-sm text-gray-500">조건에 맞는 이력이 없습니다.</p>
                    )}
                  </div>
                </div>
              )}

              {subTab === "failures" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      실패 목록 ({failures.length})
                    </h3>
                    <button
                      type="button"
                      disabled={retryBusy || failures.length === 0}
                      onClick={() => void runRetry()}
                      className="rounded border border-violet-700 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-950 disabled:opacity-50"
                    >
                      {retryBusy ? "재시도 중…" : "Bulk Retry"}
                    </button>
                  </div>
                  {failures.length === 0 ? (
                    <p className="text-sm text-gray-500">실패 건이 없습니다.</p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {failures.map((n) => (
                        <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                          <div>
                            <div className="font-medium">
                              {n.teamName} · {opsRoleLabel(n.recipientRole)}
                            </div>
                            <div className="text-xs text-rose-700">
                              {n.errorCode || "ERROR"} · {n.errorMessage || "원인 미상"}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={retryBusy}
                            onClick={() => void runRetry(n.id)}
                            className="rounded border border-violet-800 bg-violet-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Single Retry
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">발송 상세</h3>
              <button type="button" onClick={() => setDetail(null)} className="text-sm text-gray-600">
                닫기
              </button>
            </div>
            <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5 text-xs">
              <dt className="text-gray-500">팀</dt>
              <dd>{detail.teamName}</dd>
              <dt className="text-gray-500">대상</dt>
              <dd>{opsRoleLabel(detail.recipientRole)}</dd>
              <dt className="text-gray-500">전화</dt>
              <dd>{formatOpsPhone(detail.recipientPhone)}</dd>
              <dt className="text-gray-500">유형</dt>
              <dd>{opsKindLabel(detail.kind)}</dd>
              <dt className="text-gray-500">상태</dt>
              <dd>
                <StatusBadge
                  status={detail.status}
                  deliveryStatus={detail.deliveryStatus}
                />
              </dd>
              <dt className="text-gray-500">Provider</dt>
              <dd>{detail.provider || "—"}</dd>
              <dt className="text-gray-500">Message ID</dt>
              <dd className="break-all font-mono">{detail.providerMessageId || "—"}</dd>
              <dt className="text-gray-500">Request ID</dt>
              <dd className="break-all font-mono">{detail.requestId || "—"}</dd>
              <dt className="text-gray-500">생성</dt>
              <dd>{formatOpsTime(detail.createdAt)}</dd>
              <dt className="text-gray-500">발송</dt>
              <dd>{formatOpsTime(detail.sentAt)}</dd>
              <dt className="text-gray-500">완료</dt>
              <dd>{formatOpsTime(detail.completedAt)}</dd>
              <dt className="text-gray-500">재시도</dt>
              <dd>{detail.retryCount}</dd>
              <dt className="text-gray-500">success</dt>
              <dd>
                {detail.success === null ? "—" : detail.success ? "true" : "false"}
              </dd>
              <dt className="text-gray-500">Error</dt>
              <dd>
                {detail.errorCode || "—"}
                {detail.errorMessage ? ` · ${detail.errorMessage}` : ""}
              </dd>
              <dt className="text-gray-500">예약번호</dt>
              <dd>{detail.shortReservationCode || "—"}</dd>
            </dl>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">발송 내용</div>
              <pre className="whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-xs text-gray-800 max-h-56 overflow-auto">
                {detail.body || detail.message || "(내용 없음)"}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
