/**
 * Venue allocation workflow — multi-club request + board occupancy (unit).
 * No Production write.
 */
jest.mock("@/lib/firebase", () => ({ db: {} }));

import {
  buildAllocationSlotViews,
  buildMonthCalendarCells,
  buildMonthlyAllocationBoard,
  datesInYearMonth,
  summarizeBoardRowsByDate,
  venueAllocationRequestDocId,
  venueSlotAllocationDocId,
} from "@/lib/federation/venueAllocationService";
import {
  assertAllocationReason,
  formatAllocationSlotLabel,
  mapLegacyBookingStatusToAllocation,
  type VenueAllocationRequest,
  type VenueSlotAllocation,
} from "@/lib/federation/venueAllocationTypes";
import type { VenueBaselineAllocation, VenueBooking } from "@/lib/federation/venueRentalTypes";

function req(
  overrides: Partial<VenueAllocationRequest> &
    Pick<VenueAllocationRequest, "teamId" | "startTime" | "endTime">
): VenueAllocationRequest {
  return {
    id: overrides.id || `req_test_${overrides.teamId}`,
    federationId: "nowon-football",
    venueId: "nowon-suraksan",
    bookingDate: "2026-07-15",
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    teamId: overrides.teamId,
    teamName: overrides.teamName || overrides.teamId,
    createdByUid: overrides.createdByUid || "u1",
    requestStatus: overrides.requestStatus || "REQUESTED",
    paymentStatus: "UNCONFIRMED",
    baseAmount: 0,
    lightingAmount: 0,
    totalAmount: 0,
  };
}

describe("venue allocation workflow alignment", () => {
  test("request doc id is per club per slot", () => {
    const a = venueAllocationRequestDocId("nowon-suraksan", "2026-07-15", "06:00", "clubA");
    const b = venueAllocationRequestDocId("nowon-suraksan", "2026-07-15", "06:00", "clubB");
    expect(a).toBe("req_nowon-suraksan_2026-07-15_0600_clubA");
    expect(b).toBe("req_nowon-suraksan_2026-07-15_0600_clubB");
    expect(a).not.toBe(b);
  });

  test("winner cursor id matches Sprint 1 slot shape", () => {
    expect(venueSlotAllocationDocId("nowon-suraksan", "2026-07-15", "06:00")).toBe(
      "slot_nowon-suraksan_2026-07-15_0600"
    );
  });

  test("three REQUESTED clubs do not mark slot ALLOCATED", () => {
    const views = buildAllocationSlotViews({
      requests: [
        req({ teamId: "clubA", startTime: "06:00", endTime: "08:00" }),
        req({ teamId: "clubB", startTime: "06:00", endTime: "08:00" }),
        req({ teamId: "clubC", startTime: "06:00", endTime: "08:00" }),
      ],
      winners: [],
      viewerTeamId: null,
    });
    const slot = views.find((v) => v.startTime === "06:00");
    expect(slot?.status).toBe("AVAILABLE");
    expect(slot?.requestCount).toBe(3);
    expect(formatAllocationSlotLabel(slot!.status)).toBe("배정 신청 가능");
  });

  test("own pending shows 배정 심사 중; other club still AVAILABLE", () => {
    const requests = [
      req({ teamId: "clubA", startTime: "06:00", endTime: "08:00" }),
      req({ teamId: "clubB", startTime: "06:00", endTime: "08:00" }),
    ];
    const forA = buildAllocationSlotViews({
      requests,
      winners: [],
      viewerTeamId: "clubA",
    }).find((v) => v.startTime === "06:00");
    const forB = buildAllocationSlotViews({
      requests,
      winners: [],
      viewerTeamId: "clubC",
    }).find((v) => v.startTime === "06:00");
    expect(forA?.status).toBe("OWN_PENDING");
    expect(formatAllocationSlotLabel(forA!.status)).toBe("배정 심사 중");
    expect(forB?.status).toBe("AVAILABLE");
  });

  test("winner ALLOCATED blocks and hides club id in public label", () => {
    const winners: VenueSlotAllocation[] = [
      {
        id: "slot_nowon-suraksan_2026-07-15_0600",
        federationId: "nowon-football",
        venueId: "nowon-suraksan",
        bookingDate: "2026-07-15",
        startTime: "06:00",
        endTime: "08:00",
        allocatedTeamId: "clubB",
        allocatedRequestId: "req_b",
        allocatedByUid: "admin1",
        allocationSource: "REQUEST_SELECTION",
        status: "ALLOCATED",
      },
    ];
    const publicView = buildAllocationSlotViews({
      requests: [req({ teamId: "clubB", startTime: "06:00", endTime: "08:00", requestStatus: "ALLOCATED" })],
      winners,
      viewerTeamId: "clubA",
    }).find((v) => v.startTime === "06:00");
    expect(publicView?.status).toBe("ALLOCATED");
    expect(formatAllocationSlotLabel(publicView!.status)).toBe("배정 완료");
    expect(formatAllocationSlotLabel(publicView!.status)).not.toContain("clubB");
    const own = buildAllocationSlotViews({
      requests: [],
      winners,
      viewerTeamId: "clubB",
    }).find((v) => v.startTime === "06:00");
    expect(formatAllocationSlotLabel(own!.status, { isOwnAllocated: own!.isOwnAllocated })).toBe(
      "우리 팀 배정"
    );
  });

  test("baseline OCCUPIED is provenance only — not final 배정 완료", () => {
    const baselines: VenueBaselineAllocation[] = [
      {
        id: "base1",
        federationId: "nowon-football",
        venueId: "nowon-suraksan",
        bookingDate: "2026-07-15",
        startTime: "16:00",
        endTime: "18:00",
        sourceType: "XLSX_BASELINE",
        sourceAllocationLabel: "다원클럽",
        sourceFile: "x.xlsx",
        sourceSheet: "s",
        sourceCell: "A1",
        status: "OCCUPIED",
        importManifestVersion: "v1",
      },
    ];
    const views = buildAllocationSlotViews({
      requests: [],
      winners: [],
      baselines,
      viewerTeamId: null,
    });
    const slot = views.find((v) => v.startTime === "16:00");
    expect(slot?.status).toBe("AVAILABLE");
    expect(slot?.hasBaselineProvenance).toBe(true);
    expect(formatAllocationSlotLabel(slot!.status)).toBe("배정 신청 가능");
  });

  test("legacy APPROVED booking still blocks as allocation", () => {
    const legacy: VenueBooking[] = [
      {
        id: "slot_nowon-suraksan_2026-07-15_1000",
        federationId: "nowon-football",
        venueId: "nowon-suraksan",
        bookingDate: "2026-07-15",
        startTime: "10:00",
        endTime: "12:00",
        applicantType: "team",
        teamId: "legacyClub",
        bookingStatus: "APPROVED",
        paymentStatus: "UNCONFIRMED",
        pricingStatus: "REVIEW_REQUIRED",
        baseAmount: 0,
        lightingAmount: 0,
        totalAmount: 0,
        createdByUid: "u",
      },
    ];
    const slot = buildAllocationSlotViews({
      requests: [],
      winners: [],
      legacyBookings: legacy,
    }).find((v) => v.startTime === "10:00");
    expect(slot?.status).toBe("ALLOCATED");
  });

  test("legacy status mapping", () => {
    expect(mapLegacyBookingStatusToAllocation("APPROVED")).toBe("ALLOCATED");
    expect(mapLegacyBookingStatusToAllocation("REQUESTED")).toBe("REQUESTED");
    expect(mapLegacyBookingStatusToAllocation("REJECTED")).toBe("NOT_ALLOCATED");
    expect(mapLegacyBookingStatusToAllocation("CANCELLED")).toBe("WITHDRAWN");
  });

  test("ADMIN_DIRECT winner blocks like REQUEST_SELECTION", () => {
    const winners: VenueSlotAllocation[] = [
      {
        id: "slot_nowon-suraksan_2026-07-15_0600",
        federationId: "nowon-football",
        venueId: "nowon-suraksan",
        bookingDate: "2026-07-15",
        startTime: "06:00",
        endTime: "08:00",
        allocatedTeamId: "nowonFC",
        allocatedRequestId: "req_direct",
        allocatedByUid: "admin1",
        allocationSource: "ADMIN_DIRECT",
        status: "ALLOCATED",
      },
    ];
    const slot = buildAllocationSlotViews({
      requests: [],
      winners,
      viewerTeamId: "other",
    }).find((v) => v.startTime === "06:00");
    expect(slot?.status).toBe("ALLOCATED");
    expect(winners[0].allocationSource).toBe("ADMIN_DIRECT");
    expect(formatAllocationSlotLabel(slot!.status)).toBe("배정 완료");
  });

  test("CANCELLED winner does not block slot (P12 OPEN)", () => {
    const winners: VenueSlotAllocation[] = [
      {
        id: "slot_nowon-suraksan_2026-07-15_0600",
        federationId: "nowon-football",
        venueId: "nowon-suraksan",
        bookingDate: "2026-07-15",
        startTime: "06:00",
        endTime: "08:00",
        allocatedTeamId: "nowonFC",
        allocatedRequestId: "req_direct",
        allocatedByUid: "admin1",
        allocationSource: "ADMIN_DIRECT",
        status: "CANCELLED",
      },
    ];
    const slot = buildAllocationSlotViews({
      requests: [],
      winners,
      viewerTeamId: null,
    }).find((v) => v.startTime === "06:00");
    expect(slot?.status).toBe("AVAILABLE");
  });

  test("assertAllocationReason requires OTHER text", () => {
    expect(() => assertAllocationReason("OTHER", "")).toThrow(/기타/);
    expect(assertAllocationReason("WEATHER_RAIN", null).reasonCode).toBe("WEATHER_RAIN");
  });

  test("monthly board ACTIVITY mode aggregates request pool", () => {
    const rows = buildMonthlyAllocationBoard({
      yearMonth: "2026-07",
      venues: [{ id: "nowon-suraksan", name: "수락산" }],
      requests: [
        req({ teamId: "clubA", startTime: "06:00", endTime: "08:00" }),
        req({ teamId: "clubB", startTime: "06:00", endTime: "08:00" }),
      ],
      winners: [],
      mode: "ACTIVITY",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("REQUEST_POOL");
    expect(rows[0].requestCount).toBe(2);
  });

  test("monthly board ALL mode lists every date × 2h slot for venue", () => {
    const dates = datesInYearMonth("2026-07");
    expect(dates).toHaveLength(31);
    const rows = buildMonthlyAllocationBoard({
      yearMonth: "2026-07",
      venues: [{ id: "nowon-suraksan", name: "수락산" }],
      requests: [
        req({ teamId: "clubA", startTime: "06:00", endTime: "08:00" }),
      ],
      winners: [],
      venueIdFilter: "nowon-suraksan",
      mode: "ALL",
    });
    // DEFAULT day window 06–22 → 8 slots/day × 31
    expect(rows.length).toBe(dates.length * 8);
    const hit = rows.find(
      (r) => r.bookingDate === "2026-07-15" && r.startTime === "06:00"
    );
    expect(hit?.status).toBe("REQUEST_POOL");
    const empty = rows.find(
      (r) => r.bookingDate === "2026-07-15" && r.startTime === "08:00"
    );
    expect(empty?.status).toBe("OPEN");
  });

  test("calendar summarizes day counts and Monday-first grid", () => {
    const rows = buildMonthlyAllocationBoard({
      yearMonth: "2026-07",
      venues: [{ id: "nowon-suraksan", name: "수락산" }],
      requests: [req({ teamId: "clubA", startTime: "06:00", endTime: "08:00" })],
      winners: [
        {
          id: "slot_nowon-suraksan_2026-07-15_1000",
          federationId: "nowon-football",
          venueId: "nowon-suraksan",
          bookingDate: "2026-07-15",
          startTime: "10:00",
          endTime: "12:00",
          allocatedTeamId: "clubX",
          allocatedRequestId: "req_x",
          allocatedByUid: "admin1",
          allocationSource: "ADMIN_DIRECT",
          status: "ALLOCATED",
        },
      ],
      venueIdFilter: "nowon-suraksan",
      mode: "ALL",
    });
    const sum = summarizeBoardRowsByDate(rows).get("2026-07-15");
    expect(sum?.requestPool).toBe(1);
    expect(sum?.adminDirect).toBe(1);
    expect(sum?.open).toBe(6); // 8 slots - 1 pool - 1 direct
    const cells = buildMonthCalendarCells("2026-07");
    // 2026-07-01 = Wednesday → 2 leading pads (Mon,Tue)
    expect(cells[0].date).toBeNull();
    expect(cells[2].date).toBe("2026-07-01");
  });
});
