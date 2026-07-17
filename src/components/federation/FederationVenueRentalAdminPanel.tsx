import { useEffect, useMemo, useState } from "react";
import {
  adminDirectAllocateVenueSlot,
  allocateVenueSlotToTeam,
  buildMonthCalendarCells,
  buildMonthlyAllocationBoard,
  cancelVenueSlotAllocation,
  listChangeLogsForSlot,
  listPendingRequestsForSlot,
  reallocateVenueSlotAllocation,
  subscribeAllVenueAllocationRequests,
  subscribeAllVenueSlotAllocations,
  summarizeBoardRowsByDate,
} from "@/lib/federation/venueAllocationService";
import {
  VENUE_ALLOCATION_REASON_OPTIONS,
  type AdminCalendarDaySummary,
  type AdminMonthlyBoardRow,
  type VenueAllocationChangeLog,
  type VenueAllocationChangeReasonCode,
  type VenueAllocationRequest,
  type VenueSlotAllocation,
} from "@/lib/federation/venueAllocationTypes";
import {
  approveVenueBooking,
  buildTwoHourSlots,
  listFederationVenues,
  rejectVenueBooking,
  subscribeAllVenueBookings,
} from "@/lib/federation/venueRentalService";
import type { FederationVenue, VenueBooking, VenueBookingStatus } from "@/lib/federation/venueRentalTypes";
import { listFederationTeams } from "@/services/federationOperatingService";
import type { FederationOperatingTeam } from "@/types/federationOperating";

type Props = {
  federationSlug: string;
  adminUid: string;
};

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function emptyDaySummary(bookingDate: string): AdminCalendarDaySummary {
  return {
    bookingDate,
    open: 0,
    requestPool: 0,
    adminDirect: 0,
    requestSelection: 0,
  };
}

function formatTs(v: unknown): string {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toLocaleString("ko-KR");
    } catch {
      return "—";
    }
  }
  return "—";
}

type ReasonModalState =
  | { mode: "cancel"; row: AdminMonthlyBoardRow }
  | {
      mode: "reallocate";
      row: AdminMonthlyBoardRow;
      toTeamId: string;
      allocationSource: "REQUEST_SELECTION" | "ADMIN_DIRECT";
      winningRequestId?: string;
    };

export function FederationVenueRentalAdminPanel({ federationSlug, adminUid }: Props) {
  const [requests, setRequests] = useState<VenueAllocationRequest[]>([]);
  const [winners, setWinners] = useState<VenueSlotAllocation[]>([]);
  const [legacyRows, setLegacyRows] = useState<VenueBooking[]>([]);
  const [venues, setVenues] = useState<FederationVenue[]>([]);
  const [teams, setTeams] = useState<FederationOperatingTeam[]>([]);
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [venueFilter, setVenueFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<ReasonModalState | null>(null);
  const [reasonCode, setReasonCode] = useState<VenueAllocationChangeReasonCode>("FEDERATION_ADJUSTMENT");
  const [reasonText, setReasonText] = useState("");
  const [logs, setLogs] = useState<VenueAllocationChangeLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<VenueAllocationRequest[] | null>(null);
  const [directSlot, setDirectSlot] = useState("06:00|08:00");
  const [directTeamId, setDirectTeamId] = useState("");
  const [directDate, setDirectDate] = useState("");
  const [legacyFilter, setLegacyFilter] = useState<"ALL" | VenueBookingStatus>("REQUESTED");
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<
    "ALL" | "OPEN" | "REQUEST_POOL" | "ADMIN_DIRECT" | "ALLOCATED"
  >("ALL");

  const slotOptions = useMemo(() => buildTwoHourSlots(), []);

  function dayMatchesStatusFilter(sum: AdminCalendarDaySummary): boolean {
    switch (calendarStatusFilter) {
      case "OPEN":
        return sum.open > 0;
      case "REQUEST_POOL":
        return sum.requestPool > 0;
      case "ADMIN_DIRECT":
        return sum.adminDirect > 0;
      case "ALLOCATED":
        return sum.requestSelection > 0;
      default:
        return true;
    }
  }

  useEffect(() => {
    const u1 = subscribeAllVenueAllocationRequests(federationSlug, setRequests);
    const u2 = subscribeAllVenueSlotAllocations(federationSlug, setWinners);
    const u3 = subscribeAllVenueBookings(federationSlug, setLegacyRows);
    listFederationVenues(federationSlug)
      .then((list) => {
        setVenues(list);
        setVenueFilter((prev) => prev || list[0]?.id || "");
      })
      .catch(() => setVenues([]));
    listFederationTeams(federationSlug)
      .then((rows) => setTeams(rows.filter((t) => t.isActive)))
      .catch(() => setTeams([]));
    return () => {
      u1();
      u2();
      u3();
    };
  }, [federationSlug]);

  const boardRows = useMemo(() => {
    if (!venueFilter) return [];
    return buildMonthlyAllocationBoard({
      yearMonth,
      venues: venues.map((v) => ({ id: v.id, name: v.name })),
      requests,
      winners,
      venueIdFilter: venueFilter,
      mode: "ALL",
    });
  }, [yearMonth, venues, requests, winners, venueFilter]);

  const daySummaries = useMemo(() => summarizeBoardRowsByDate(boardRows), [boardRows]);
  const calendarCells = useMemo(() => buildMonthCalendarCells(yearMonth), [yearMonth]);

  useEffect(() => {
    if (!venueFilter) {
      setSelectedDate(null);
      setSelectedKey(null);
      return;
    }
    const today = todayIso();
    const inMonth = today.startsWith(yearMonth) ? today : `${yearMonth}-01`;
    setSelectedDate(inMonth);
    setDirectDate(inMonth);
    setSelectedKey(null);
  }, [yearMonth, venueFilter]);

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    return boardRows.filter((r) => r.bookingDate === selectedDate);
  }, [boardRows, selectedDate]);

  const selected = boardRows.find((r) => r.key === selectedKey) || null;
  const selectedDaySummary =
    (selectedDate && daySummaries.get(selectedDate)) ||
    (selectedDate ? emptyDaySummary(selectedDate) : null);

  useEffect(() => {
    if (!selected || !showLogs) {
      setLogs([]);
      return;
    }
    listChangeLogsForSlot({
      federationSlug,
      venueId: selected.venueId,
      bookingDate: selected.bookingDate,
      startTime: selected.startTime,
    })
      .then(setLogs)
      .catch(() => setLogs([]));
  }, [federationSlug, selected, showLogs, selected?.winner?.status, msg]);

  async function onAllocateFromPool(requestId: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await allocateVenueSlotToTeam({ federationSlug, requestId, adminUid });
      setMsg("배정 완료 (REQUEST_SELECTION)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "배정 실패");
    } finally {
      setBusy(false);
    }
  }

  async function runInlineDirect(acknowledgePendingOverride: boolean) {
    if (!selected) return;
    const team = teams.find((t) => t.id === directTeamId);
    if (!team) {
      setError("가입 클럽을 선택하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminDirectAllocateVenueSlot({
        federationSlug,
        venueId: selected.venueId,
        venueName: selected.venueName,
        bookingDate: selected.bookingDate,
        startTime: selected.startTime,
        endTime: selected.endTime,
        teamId: team.id,
        teamName: team.name,
        adminUid,
        acknowledgePendingOverride,
      });
      setPendingOverride(null);
      setMsg(`선배정 완료 · ${team.name}`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "";
      if (m.startsWith("PENDING_OVERRIDE_REQUIRED:")) {
        const pending = await listPendingRequestsForSlot({
          federationSlug,
          venueId: selected.venueId,
          bookingDate: selected.bookingDate,
          startTime: selected.startTime,
          endTime: selected.endTime,
        });
        setPendingOverride(pending);
      } else {
        setError(m || "선배정 실패");
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitReasonModal() {
    if (!reasonModal) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      if (reasonModal.mode === "cancel") {
        const { row } = reasonModal;
        await cancelVenueSlotAllocation({
          federationSlug,
          venueId: row.venueId,
          bookingDate: row.bookingDate,
          startTime: row.startTime,
          endTime: row.endTime,
          adminUid,
          reasonCode,
          reasonText,
        });
        setMsg("배정 취소 완료 · 슬롯 신청 가능");
      } else {
        const { row, toTeamId, allocationSource, winningRequestId } = reasonModal;
        const team = teams.find((t) => t.id === toTeamId);
        if (!team) throw new Error("가입 클럽을 선택하세요.");
        await reallocateVenueSlotAllocation({
          federationSlug,
          venueId: row.venueId,
          venueName: row.venueName,
          bookingDate: row.bookingDate,
          startTime: row.startTime,
          endTime: row.endTime,
          toTeamId: team.id,
          toTeamName: team.name,
          adminUid,
          reasonCode,
          reasonText,
          allocationSource,
          winningRequestId,
          acknowledgePendingOverride: true,
        });
        setMsg(`재배정 완료 · ${team.name}`);
      }
      setReasonModal(null);
      setReasonText("");
      setShowLogs(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  }

  async function onLegacyApprove(bookingId: string) {
    setBusy(true);
    try {
      await approveVenueBooking({ federationSlug, bookingId, adminUid });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "레거시 승인 실패");
    } finally {
      setBusy(false);
    }
  }

  async function onLegacyReject(bookingId: string) {
    setBusy(true);
    try {
      await rejectVenueBooking({ federationSlug, bookingId, adminUid });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "레거시 거절 실패");
    } finally {
      setBusy(false);
    }
  }

  const legacyFiltered = useMemo(() => {
    if (legacyFilter === "ALL") return legacyRows;
    return legacyRows.filter((r) => r.bookingStatus === legacyFilter);
  }, [legacyRows, legacyFilter]);

  const statusBadge = (row: AdminMonthlyBoardRow) => {
    if (row.status === "ALLOCATED") {
      return row.winner?.allocationSource === "ADMIN_DIRECT" ? "선배정" : "배정완료";
    }
    if (row.status === "REQUEST_POOL") return `신청중(${row.requestCount})`;
    return "신청가능";
  };

  const rowBadgeClass = (row: AdminMonthlyBoardRow) => {
    if (row.status === "ALLOCATED") {
      return row.winner?.allocationSource === "ADMIN_DIRECT"
        ? "bg-sky-100 text-sky-900"
        : "bg-violet-100 text-violet-900";
    }
    if (row.status === "REQUEST_POOL") return "bg-amber-100 text-amber-900";
    return "bg-emerald-50 text-emerald-800";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">월간 배정 캘린더</h2>
        <p className="text-sm text-gray-600">
          왼쪽 달력 · 오른쪽 상세 작업 · 하단 빠른 선배정 · 입금·확정 HOLD
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-end gap-1">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            onClick={() => setYearMonth((ym) => shiftYearMonth(ym, -1))}
            aria-label="이전 달"
          >
            ◀
          </button>
          <label className="text-sm">
            <span className="text-gray-600">연월</span>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5"
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            onClick={() => setYearMonth((ym) => shiftYearMonth(ym, 1))}
            aria-label="다음 달"
          >
            ▶
          </button>
        </div>
        <label className="text-sm">
          <span className="text-gray-600">구장 (필수)</span>
          <select
            value={venueFilter}
            onChange={(e) => {
              setVenueFilter(e.target.value);
              setSelectedKey(null);
            }}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 min-w-[10rem]"
          >
            <option value="" disabled>
              구장 선택
            </option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {(
            [
              { id: "ALL" as const, label: "전체" },
              { id: "OPEN" as const, label: "신청가능" },
              { id: "REQUEST_POOL" as const, label: "신청중" },
              { id: "ADMIN_DIRECT" as const, label: "선배정" },
              { id: "ALLOCATED" as const, label: "배정완료" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCalendarStatusFilter(f.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                calendarStatusFilter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 pb-1 w-full basis-full">
          달력 표기:{" "}
          <span className="text-emerald-700 font-semibold">신=신청가능</span> ·{" "}
          <span className="text-amber-800 font-semibold">중=신청중</span> ·{" "}
          <span className="text-sky-800 font-semibold">선=선배정</span> ·{" "}
          <span className="text-violet-800 font-semibold">배=배정완료</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}
      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div className="space-y-3 min-w-0">
          {!venueFilter && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
              구장을 선택하세요.
            </div>
          )}
          {venueFilter && (
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-1">
                {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  if (!cell.date) {
                    return <div key={`pad-${idx}`} className="min-h-[5.5rem] rounded-lg bg-gray-50" />;
                  }
                  const sum = daySummaries.get(cell.date) || emptyDaySummary(cell.date);
                  const active = selectedDate === cell.date;
                  const match = dayMatchesStatusFilter(sum);
                  const isToday = cell.date === todayIso();
                  const assigned = sum.adminDirect + sum.requestSelection;
                  const totalSlots = sum.open + sum.requestPool + assigned;
                  const heavyAssigned = totalSlots > 0 && assigned / totalSlots >= 0.5;
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(cell.date);
                        setDirectDate(cell.date || "");
                        setSelectedKey(null);
                        setShowLogs(false);
                        setPendingOverride(null);
                      }}
                      className={`min-h-[5.75rem] rounded-lg border px-1 py-1 text-left transition ${
                        active
                          ? "border-emerald-700 bg-emerald-100 ring-2 ring-emerald-600"
                          : isToday
                            ? "border-sky-400 bg-sky-50 hover:border-sky-500"
                            : heavyAssigned
                              ? "border-violet-200 bg-violet-50/80 hover:border-violet-300"
                              : "border-gray-200 bg-white hover:border-gray-300"
                      } ${match ? "" : "opacity-35"}`}
                    >
                      <div className="flex items-baseline justify-between gap-0.5 mb-0.5">
                        <span className="text-sm font-bold text-gray-900 leading-none">
                          {cell.day}
                        </span>
                        {isToday && !active && (
                          <span className="text-[9px] font-semibold text-sky-700">오늘</span>
                        )}
                      </div>
                      <div className="text-[9px] text-gray-500 mb-0.5 leading-tight">
                        빈{sum.open}·배{assigned}
                      </div>
                      <div className="flex flex-col gap-0.5 text-[11px] font-bold leading-tight">
                        {sum.open > 0 && (
                          <span className="inline-flex w-fit rounded px-1 bg-emerald-100 text-emerald-800">
                            신{sum.open}
                          </span>
                        )}
                        {sum.requestPool > 0 && (
                          <span className="inline-flex w-fit rounded px-1 bg-amber-100 text-amber-900">
                            중{sum.requestPool}
                          </span>
                        )}
                        {sum.adminDirect > 0 && (
                          <span className="inline-flex w-fit rounded px-1 bg-sky-100 text-sky-900">
                            선{sum.adminDirect}
                          </span>
                        )}
                        {sum.requestSelection > 0 && (
                          <span className="inline-flex w-fit rounded px-1 bg-violet-100 text-violet-900">
                            배{sum.requestSelection}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 min-h-[320px] min-w-0 lg:min-w-[320px]">
          {!selectedDate && (
            <p className="text-sm text-gray-500">달력에서 날짜를 선택하세요.</p>
          )}

          {selectedDate && (
            <div className="space-y-3">
              <div className="border-b pb-3">
                <p className="text-xs text-gray-500">작업 날짜</p>
                <h3 className="text-lg font-bold text-gray-900">{selectedDate}</h3>
                <p className="text-sm text-gray-600">
                  {venues.find((v) => v.id === venueFilter)?.name || venueFilter}
                </p>
                {selectedDaySummary && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                    <div className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-1 font-semibold">
                      신청가능 {selectedDaySummary.open}
                    </div>
                    <div className="rounded-md bg-amber-50 text-amber-900 px-2 py-1 font-semibold">
                      신청중 {selectedDaySummary.requestPool}
                    </div>
                    <div className="rounded-md bg-sky-50 text-sky-900 px-2 py-1 font-semibold">
                      선배정 {selectedDaySummary.adminDirect}
                    </div>
                    <div className="rounded-md bg-violet-50 text-violet-900 px-2 py-1 font-semibold">
                      배정완료 {selectedDaySummary.requestSelection}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {selected
                    ? "아래에서 신청팀·배정 작업을 진행하세요."
                    : "슬롯을 고르면 신청팀·선배정·배정·재배정·취소가 이 패널에서 끝납니다."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-800 mb-1">① 슬롯 선택</p>
                <ul className="divide-y rounded-lg border border-gray-100 max-h-48 overflow-auto">
                  {daySlots.map((row) => (
                    <li key={row.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedKey(row.key);
                          setShowLogs(false);
                          setError(null);
                          setPendingOverride(null);
                        }}
                        className={`w-full flex justify-between px-3 py-2 text-sm hover:bg-gray-50 ${
                          selectedKey === row.key ? "bg-primary-50" : ""
                        }`}
                      >
                        <span className="font-medium">
                          {row.startTime}–{row.endTime}
                        </span>
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${rowBadgeClass(row)}`}
                        >
                          {row.status === "ALLOCATED" && row.winnerTeamName
                            ? `${statusBadge(row)} · ${row.winnerTeamName}`
                            : statusBadge(row)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selected && (
            <>
              <div className="rounded-lg border border-primary-100 bg-primary-50/50 px-3 py-2">
                <p className="text-xs text-primary-800">② 선택 슬롯</p>
                <p className="font-bold text-gray-900">
                  {selected.startTime}–{selected.endTime}
                  <span className="ml-2 text-sm font-semibold text-gray-600">
                    {statusBadge(selected)}
                    {selected.winnerTeamName ? ` · ${selected.winnerTeamName}` : ""}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-800">③ 신청팀</p>
                {selected.pendingRequests.length === 0 && selected.status !== "ALLOCATED" && (
                  <p className="text-sm text-gray-500">신청 없음 · 선배정 가능</p>
                )}
                {selected.pendingRequests.length === 0 && selected.status === "ALLOCATED" && (
                  <p className="text-sm text-gray-500">대기 신청 없음</p>
                )}
                <ol className="space-y-2 list-decimal list-inside">
                  {selected.pendingRequests.map((r, i) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm list-none"
                    >
                      <span>
                        <span className="text-amber-800 font-semibold mr-2">{i + 1}</span>
                        {r.teamName || r.teamId}
                      </span>
                      {selected.status !== "ALLOCATED" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onAllocateFromPool(r.id)}
                          className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs font-semibold disabled:opacity-50"
                        >
                          배정
                        </button>
                      )}
                      {selected.status === "ALLOCATED" && (
                        <button
                          type="button"
                          className="text-xs underline text-gray-700"
                          onClick={() => {
                            setReasonModal({
                              mode: "reallocate",
                              row: selected,
                              toTeamId: r.teamId,
                              allocationSource: "REQUEST_SELECTION",
                              winningRequestId: r.id,
                            });
                            setReasonCode("FEDERATION_ADJUSTMENT");
                            setReasonText("");
                          }}
                        >
                          이 팀으로 재배정
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {selected.status === "ALLOCATED" && selected.winner && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">배정 클럽</span>{" "}
                    <strong>{selected.winnerTeamName}</strong>
                  </div>
                  <div className="text-xs text-gray-500">
                    {selected.winner.allocationSource} · 배정자{" "}
                    {selected.winner.allocatedByUid.slice(0, 8)}… ·{" "}
                    {formatTs(selected.winner.allocatedAt)}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-800">④ 배정 작업</p>
                <div className="flex flex-wrap gap-2">
                  {selected.status !== "ALLOCATED" && (
                    <>
                      <select
                        value={directTeamId}
                        onChange={(e) => setDirectTeamId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">가입 클럽 선택 (선배정)</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {pendingOverride && pendingOverride.length > 0 ? (
                        <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs space-y-2">
                          <p className="font-semibold">
                            ⚠ 신청 {pendingOverride.length}팀 — 선배정 시 미배정 처리됩니다.
                          </p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setPendingOverride(null)}>
                              닫기
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runInlineDirect(true)}
                              className="font-semibold text-amber-900"
                            >
                              선배정 확정
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || !directTeamId}
                          onClick={() => void runInlineDirect(false)}
                          className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          선배정
                        </button>
                      )}
                    </>
                  )}
                  {selected.status === "ALLOCATED" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setReasonCode("FEDERATION_ADJUSTMENT");
                          setReasonText("");
                          setReasonModal({
                            mode: "reallocate",
                            row: selected,
                            toTeamId: "",
                            allocationSource: "ADMIN_DIRECT",
                          });
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold"
                      >
                        재배정
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setReasonCode("FEDERATION_ADJUSTMENT");
                          setReasonText("");
                          setReasonModal({ mode: "cancel", row: selected });
                        }}
                        className="rounded-lg border border-red-300 text-red-800 px-3 py-1.5 text-xs font-semibold"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setShowLogs((v) => !v)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold"
                      >
                        이력
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled
                    title="Payment Signal 설계만 LOCK — 구현 HOLD"
                    className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed"
                  >
                    입금확인 (HOLD)
                  </button>
                  <button
                    type="button"
                    disabled
                    title="PS1 — 입금 확인 후 배정 확정"
                    className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed"
                  >
                    최종확정 (HOLD)
                  </button>
                </div>
              </div>

              {showLogs && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold mb-2">변경 이력</p>
                  {logs.length === 0 && <p className="text-xs text-gray-500">이력 없음</p>}
                  <ul className="space-y-2 max-h-40 overflow-auto text-xs">
                    {logs.map((l) => (
                      <li key={l.id} className="rounded border border-gray-100 p-2">
                        <div className="font-medium">
                          {l.changeType} · {l.reasonCode}
                        </div>
                        <div className="text-gray-600">
                          {l.fromTeamId || "—"} → {l.toTeamId || "(취소)"}
                        </div>
                        {l.reasonText && <div>{l.reasonText}</div>}
                        <div className="text-gray-400">by {l.changedByUid.slice(0, 8)}…</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Zone C — global ADMIN_DIRECT for any date */}
      <div className="rounded-xl border border-primary-200 bg-white p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">빠른 선배정</h3>
        <p className="text-xs text-gray-500">날짜는 달력에서 선택한 값이 자동 반영됩니다 (수정 불가).</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <label>
            구장
            <select
              value={venueFilter || ""}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-1.5"
            >
              <option value="">선택</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-gray-700">날짜</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
              <span className="font-semibold text-gray-900">
                {selectedDate || directDate || "달력에서 날짜 선택"}
              </span>
              {(selectedDate || directDate) && (
                <span className="rounded-full bg-primary-100 text-primary-800 px-2 py-0.5 text-[10px] font-semibold">
                  달력과 연동됨
                </span>
              )}
            </div>
          </div>
          <label>
            시간
            <select
              value={directSlot}
              onChange={(e) => setDirectSlot(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-1.5"
            >
              {slotOptions.map((s) => (
                <option key={`${s.startTime}-${s.endTime}`} value={`${s.startTime}|${s.endTime}`}>
                  {s.startTime}–{s.endTime}
                </option>
              ))}
            </select>
          </label>
          <label>
            가입 클럽
            <select
              value={directTeamId}
              onChange={(e) => setDirectTeamId(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-1.5"
            >
              <option value="">선택</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const venue = venues.find((v) => v.id === venueFilter);
            const team = teams.find((t) => t.id === directTeamId);
            const [startTime, endTime] = directSlot.split("|");
            const bookingDate = selectedDate || directDate;
            if (!venue || !team || !bookingDate || !startTime || !endTime) {
              setError("구장·날짜·시간·클럽을 선택하세요. (날짜는 달력에서 선택)");
              return;
            }
            setBusy(true);
            setError(null);
            adminDirectAllocateVenueSlot({
              federationSlug,
              venueId: venue.id,
              venueName: venue.name,
              bookingDate,
              startTime,
              endTime,
              teamId: team.id,
              teamName: team.name,
              adminUid,
              acknowledgePendingOverride: false,
            })
              .then(() => setMsg(`선배정 완료 · ${team.name} · ${bookingDate}`))
              .catch(async (e: unknown) => {
                const m = e instanceof Error ? e.message : "";
                if (m.startsWith("PENDING_OVERRIDE_REQUIRED:")) {
                  const pending = await listPendingRequestsForSlot({
                    federationSlug,
                    venueId: venue.id,
                    bookingDate,
                    startTime,
                    endTime,
                  });
                  const ok = window.confirm(
                    `현재 ${pending.length}팀 신청이 있습니다.\n${pending
                      .map((p) => p.teamName || p.teamId)
                      .join(", ")}\n\n신청하지 않은 ${team.name}을 선배정할까요?`
                  );
                  if (ok) {
                    await adminDirectAllocateVenueSlot({
                      federationSlug,
                      venueId: venue.id,
                      venueName: venue.name,
                      bookingDate,
                      startTime,
                      endTime,
                      teamId: team.id,
                      teamName: team.name,
                      adminUid,
                      acknowledgePendingOverride: true,
                    });
                    setMsg(`선배정 완료 · ${team.name}`);
                  }
                } else {
                  setError(m || "선배정 실패");
                }
              })
              .finally(() => setBusy(false));
          }}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          선배정 실행
        </button>
      </div>

      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 space-y-3 shadow-lg">
            <h3 className="font-semibold text-gray-900">
              {reasonModal.mode === "cancel" ? "배정 취소" : "재배정"} — 사유 필수
            </h3>
            {reasonModal.mode === "reallocate" && !reasonModal.toTeamId && (
              <label className="block text-sm">
                신규 배정 클럽
                <select
                  value={reasonModal.toTeamId}
                  onChange={(e) =>
                    setReasonModal({
                      ...reasonModal,
                      toTeamId: e.target.value,
                      allocationSource: "ADMIN_DIRECT",
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-2 py-1.5"
                >
                  <option value="">가입 클럽 선택</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="space-y-1 text-sm">
              {VENUE_ALLOCATION_REASON_OPTIONS.map((o) => (
                <label key={o.code} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    checked={reasonCode === o.code}
                    onChange={() => setReasonCode(o.code)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
            {reasonCode === "OTHER" && (
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="기타 사유 입력"
                className="w-full rounded-lg border px-2 py-1.5 text-sm"
                rows={2}
              />
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReasonModal(null)} className="px-3 py-1.5 text-sm">
                닫기
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  (reasonModal.mode === "reallocate" && !reasonModal.toTeamId) ||
                  (reasonCode === "OTHER" && !reasonText.trim())
                }
                onClick={() => void submitReasonModal()}
                className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <details className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer">
          레거시 venueBookings ({legacyFiltered.length})
        </summary>
        <div className="mt-2 flex gap-2 flex-wrap">
          {(["REQUESTED", "APPROVED", "ALL"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setLegacyFilter(f)}
              className="text-xs border rounded px-2 py-1"
            >
              {f}
            </button>
          ))}
        </div>
        <ul className="mt-2 max-h-40 overflow-auto text-xs space-y-1">
          {legacyFiltered.slice(0, 30).map((b) => (
            <li key={b.id} className="flex justify-between gap-2 border-b py-1">
              <span>
                {b.venueName || b.venueId} {b.bookingDate} {b.startTime} · {b.bookingStatus}
              </span>
              {b.bookingStatus === "REQUESTED" && (
                <span className="flex gap-1">
                  <button type="button" onClick={() => void onLegacyApprove(b.id)}>
                    승인
                  </button>
                  <button type="button" onClick={() => void onLegacyReject(b.id)}>
                    거절
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
