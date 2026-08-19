/**
 * P1 — CMS: venue booking policy editor + preview only.
 * Slot preview uses buildSlotsFromPolicy — same SoT as admin/public grids.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BOOKING_DURATION_CHOICES_MINUTES,
  DEFAULT_VENUE_BOOKING_POLICY,
  OPERATING_HOUR_OPTIONS,
  buildSlotsFromPolicy,
  clockFromHour,
  formatDurationHours,
  getEffectiveVenueBookingPolicy,
  hourFromClock,
  listAllowedBookingDurations,
  policyFieldLabel,
  validateVenueBookingPolicy,
  type VenueBookingPolicy,
  type VenueBookingPolicyHistoryEntry,
  type VenueSlotIntervalMinutes,
} from "@/lib/federation/venueBookingPolicy";
import {
  listVenueBookingPolicyHistory,
  saveVenueBookingPolicy,
  saveVenueDepositAccount,
} from "@/lib/federation/venueRentalService";
import type { FederationVenue } from "@/lib/federation/venueRentalTypes";
import { formatDepositAccountGuide } from "@/lib/federation/venueDepositAccount";

type Props = {
  federationSlug: string;
  venue: FederationVenue;
  adminUid: string;
  onSaved?: (policy: VenueBookingPolicy) => void;
  onDepositSaved?: (guide: string) => void;
};

function cloneDefault(): VenueBookingPolicy {
  return { ...DEFAULT_VENUE_BOOKING_POLICY };
}

function formatHistoryTime(v: unknown): string {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }
  return "—";
}

function PolicySummaryCard({ policy }: { policy: VenueBookingPolicy }) {
  const allowed = listAllowedBookingDurations(policy);
  return (
    <aside className="rounded-xl border border-violet-200 bg-white p-4 space-y-3 shadow-sm">
      <h4 className="text-sm font-bold text-gray-900">현재 운영 정책</h4>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-gray-500">예약 단위</dt>
          <dd className="font-semibold text-gray-900">
            {formatDurationHours(policy.slotIntervalMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">운영시간</dt>
          <dd className="font-semibold text-gray-900">
            {hourFromClock(policy.dayStart)}~{hourFromClock(policy.dayEnd)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">기본 예약</dt>
          <dd className="font-semibold text-violet-700">
            {formatDurationHours(policy.defaultBookingMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">허용 범위</dt>
          <dd className="font-semibold text-gray-900">
            {formatDurationHours(policy.minBookingMinutes)}~
            {formatDurationHours(policy.maxBookingMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">매시 시작</dt>
          <dd className="font-semibold text-gray-900">
            {policy.allowHourlyStart ? "ON" : "OFF"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">연속 예약</dt>
          <dd className="font-semibold text-gray-900">
            {policy.allowConsecutiveSlots ? "ON" : "OFF"}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] text-gray-500 border-t border-gray-100 pt-2">
        가능 길이:{" "}
        {allowed.length > 0
          ? allowed.map((m) => formatDurationHours(m)).join(" · ")
          : "—"}
      </p>
    </aside>
  );
}

export function VenueBookingPolicySettings({
  federationSlug,
  venue,
  adminUid,
  onSaved,
  onDepositSaved,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<VenueBookingPolicy>(() =>
    getEffectiveVenueBookingPolicy(venue.bookingPolicy ?? null)
  );
  const [depositAccount, setDepositAccount] = useState(() => ({
    bankName: venue.depositAccount?.bankName || "",
    accountNumber: venue.depositAccount?.accountNumber || "",
    accountHolder: venue.depositAccount?.accountHolder || "",
  }));
  const [busy, setBusy] = useState(false);
  const [depositBusy, setDepositBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<VenueBookingPolicyHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const savedPolicy = useMemo(
    () => getEffectiveVenueBookingPolicy(venue.bookingPolicy ?? null),
    [venue.bookingPolicy]
  );

  useEffect(() => {
    setDraft(getEffectiveVenueBookingPolicy(venue.bookingPolicy ?? null));
    setDepositAccount({
      bankName: venue.depositAccount?.bankName || "",
      accountNumber: venue.depositAccount?.accountNumber || "",
      accountHolder: venue.depositAccount?.accountHolder || "",
    });
    setErr(null);
    setMsg(null);
  }, [venue.id, venue.bookingPolicy, venue.depositAccount]);

  async function refreshHistory() {
    setHistoryLoading(true);
    try {
      const rows = await listVenueBookingPolicyHistory({
        federationSlug,
        venueId: venue.id,
        limitCount: 12,
      });
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void listVenueBookingPolicyHistory({
      federationSlug,
      venueId: venue.id,
      limitCount: 12,
    })
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [federationSlug, venue.id]);

  const validation = useMemo(() => validateVenueBookingPolicy(draft), [draft]);
  const preview = useMemo(
    () => buildSlotsFromPolicy(validation.ok ? validation.policy : draft),
    [validation, draft]
  );
  const allowedDurations = useMemo(
    () => listAllowedBookingDurations(validation.ok ? validation.policy : draft),
    [validation, draft]
  );

  const intervalOptions: VenueSlotIntervalMinutes[] = [120, 60];
  const durationChoices = BOOKING_DURATION_CHOICES_MINUTES;

  function patch(partial: Partial<VenueBookingPolicy>) {
    setDraft((prev) => {
      const next = { ...prev, ...partial, schemaVersion: 1 as const };
      if (partial.minBookingMinutes != null && next.maxBookingMinutes < partial.minBookingMinutes) {
        next.maxBookingMinutes = partial.minBookingMinutes;
      }
      const allowed = listAllowedBookingDurations(next);
      if (allowed.length > 0 && !allowed.includes(next.defaultBookingMinutes)) {
        next.defaultBookingMinutes = allowed.includes(next.minBookingMinutes)
          ? next.minBookingMinutes
          : allowed[0];
      }
      return next;
    });
    setMsg(null);
    setErr(null);
  }

  async function onSave() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const saved = await saveVenueBookingPolicy({
        federationSlug,
        venueId: venue.id,
        policy: draft,
        uid: adminUid,
      });
      setDraft(saved);
      setMsg("저장됨 · 관리자·공개 슬롯 목록이 이 정책으로 갱신됩니다");
      onSaved?.(saved);
      await refreshHistory();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDeposit() {
    setDepositBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await saveVenueDepositAccount({
        federationSlug,
        venueId: venue.id,
        depositAccount,
      });
      setMsg("입금계좌 저장됨 · 이후 배정 Reservation에 반영됩니다");
      onDepositSaved?.(formatDepositAccountGuide(depositAccount) || "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "입금계좌 저장에 실패했습니다.");
    } finally {
      setDepositBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-violet-50/80"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">
            {expanded ? "▲" : "▼"} 예약 정책
            <span className="ml-2 font-medium text-gray-600">· {venue.name}</span>
          </p>
          {!expanded ? (
            <p className="mt-0.5 text-xs text-gray-600 truncate">
              {formatDurationHours(savedPolicy.slotIntervalMinutes)} · 기본{" "}
              {formatDurationHours(savedPolicy.defaultBookingMinutes)} ·{" "}
              {hourFromClock(savedPolicy.dayStart)}~{hourFromClock(savedPolicy.dayEnd)} · 매시{" "}
              {savedPolicy.allowHourlyStart ? "ON" : "OFF"}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500">
              저장 시 우측 슬롯·빠른 선배정·공개 신청 그리드에 동일하게 반영됩니다.
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold text-violet-700">
          {expanded ? "접기" : "펼치기"}
        </span>
      </button>

      {!expanded ? (
        <div className="px-4 pb-4">
          <PolicySummaryCard policy={savedPolicy} />
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-4 border-t border-violet-100 pt-4">
          <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2">
            <p className="text-sm font-bold text-gray-900">입금계좌 (Reservation Detail)</p>
            <p className="text-xs text-gray-500">
              이 구장 문서의 계좌 정보가 예약·알림톡의 단일 기준입니다. 은행, 계좌번호, 예금주를
              모두 입력하세요.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={depositAccount.bankName}
                onChange={(e) =>
                  setDepositAccount((prev) => ({ ...prev, bankName: e.target.value }))
                }
                placeholder="은행"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                value={depositAccount.accountNumber}
                onChange={(e) =>
                  setDepositAccount((prev) => ({ ...prev, accountNumber: e.target.value }))
                }
                placeholder="계좌번호"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-mono"
              />
              <input
                value={depositAccount.accountHolder}
                onChange={(e) =>
                  setDepositAccount((prev) => ({ ...prev, accountHolder: e.target.value }))
                }
                placeholder="예금주"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={depositBusy}
              onClick={() => void onSaveDeposit()}
              className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {depositBusy ? "저장 중…" : "입금계좌 저장"}
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">예약 단위</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={draft.slotIntervalMinutes}
                    onChange={(e) =>
                      patch({
                        slotIntervalMinutes: Number(e.target.value) as VenueSlotIntervalMinutes,
                      })
                    }
                  >
                    {intervalOptions.map((iv) => (
                      <option key={iv} value={iv}>
                        {iv === 120 ? "2시간" : "1시간"}
                      </option>
                    ))}
                  </select>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    슬롯이 생성되는 간격입니다.
                  </span>
                </label>

                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">기본 예약</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={draft.defaultBookingMinutes}
                    onChange={(e) => patch({ defaultBookingMinutes: Number(e.target.value) })}
                  >
                    {(allowedDurations.length > 0 ? allowedDurations : durationChoices).map((m) => (
                      <option key={m} value={m}>
                        {formatDurationHours(m)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    신청 시 기본으로 선택되는 시간입니다.
                  </span>
                </label>

                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">최소 예약</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={draft.minBookingMinutes}
                    onChange={(e) => patch({ minBookingMinutes: Number(e.target.value) })}
                  >
                    {durationChoices.map((m) => (
                      <option key={m} value={m}>
                        {formatDurationHours(m)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">최대 예약</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={draft.maxBookingMinutes}
                    onChange={(e) => patch({ maxBookingMinutes: Number(e.target.value) })}
                  >
                    {durationChoices
                      .filter((m) => m >= draft.minBookingMinutes)
                      .map((m) => (
                        <option key={m} value={m}>
                          {formatDurationHours(m)}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">매시 시작</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={draft.allowHourlyStart ? "on" : "off"}
                    onChange={(e) => patch({ allowHourlyStart: e.target.value === "on" })}
                  >
                    <option value="off">OFF</option>
                    <option value="on">ON</option>
                  </select>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    ON이면 06, 07, 08… 시작을 허용합니다.
                  </span>
                </label>

                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">연속 예약</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={draft.allowConsecutiveSlots ? "on" : "off"}
                    onChange={(e) => patch({ allowConsecutiveSlots: e.target.value === "on" })}
                  >
                    <option value="off">OFF</option>
                    <option value="on">ON</option>
                  </select>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    여러 슬롯을 한 신청으로 묶습니다. (신청 반영은 P2)
                  </span>
                </label>

                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">운영 시작</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={hourFromClock(draft.dayStart)}
                    onChange={(e) => patch({ dayStart: clockFromHour(e.target.value) })}
                  >
                    {OPERATING_HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}시
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm block">
                  <span className="text-gray-700 font-medium">운영 종료</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
                    value={hourFromClock(draft.dayEnd)}
                    onChange={(e) => patch({ dayEnd: clockFromHour(e.target.value) })}
                  >
                    {OPERATING_HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}시
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {!validation.ok ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  저장 불가
                  <ul className="mt-1 list-disc pl-4">
                    {validation.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  슬롯 미리보기 ({preview.length})
                </p>
                <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-xs font-mono grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {preview.map((s) => (
                    <span key={s.slotId} className="rounded bg-gray-50 px-1.5 py-1 text-gray-800">
                      {s.startTime}–{s.endTime}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !validation.ok}
                  onClick={() => void onSave()}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "저장 중…" : "정책 저장"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(cloneDefault());
                    setMsg("기본(2시간)으로 폼을 되돌렸습니다. (저장 전)");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  기본(2시간)
                </button>
              </div>

              {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
              {err ? <p className="text-sm text-red-600">{err}</p> : null}
            </div>

            <div className="space-y-3">
              <PolicySummaryCard policy={validation.ok ? validation.policy : draft} />

              <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900">정책 변경 이력</h4>
                  <button
                    type="button"
                    className="text-[11px] text-violet-700 font-medium"
                    onClick={() => void refreshHistory()}
                    disabled={historyLoading}
                  >
                    {historyLoading ? "불러오는 중…" : "새로고침"}
                  </button>
                </div>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-500">아직 변경 이력이 없습니다.</p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto space-y-2">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-xs"
                      >
                        <p className="font-medium text-gray-800">{formatHistoryTime(h.createdAt)}</p>
                        <p className="text-gray-500 mt-0.5">
                          {h.changedByName || h.changedByUid || "관리자"}
                        </p>
                        <ul className="mt-1.5 space-y-0.5 text-gray-700">
                          {h.changes.map((c) => (
                            <li key={`${h.id}-${c.field}`}>
                              <span className="text-gray-500">{policyFieldLabel(c.field)}</span>{" "}
                              {c.from} → <span className="font-semibold">{c.to}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
