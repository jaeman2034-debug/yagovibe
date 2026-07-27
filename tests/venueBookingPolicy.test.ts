import { describe, expect, it } from "vitest";
import { buildTwoHourSlots } from "@/lib/federation/venueRentalService";
import {
  DEFAULT_VENUE_BOOKING_POLICY,
  defaultPolicyMatchesLegacyTwoHourGrid,
  getEffectiveVenueBookingPolicy,
  intervalsOverlap,
  listAllowedBookingDurations,
  previewSlotsFromPolicy,
  validateVenueBookingPolicy,
} from "@/lib/federation/venueBookingPolicy";

describe("venueBookingPolicy P0", () => {
  it("default matches legacy buildTwoHourSlots", () => {
    const legacy = buildTwoHourSlots();
    expect(defaultPolicyMatchesLegacyTwoHourGrid(legacy)).toBe(true);
    const preview = previewSlotsFromPolicy(DEFAULT_VENUE_BOOKING_POLICY);
    expect(preview[0]).toEqual({ startTime: "06:00", endTime: "08:00", slotId: "0600" });
    expect(preview[preview.length - 1]).toEqual({
      startTime: "20:00",
      endTime: "22:00",
      slotId: "2000",
    });
  });

  it("missing/invalid → effective 2h fallback", () => {
    expect(getEffectiveVenueBookingPolicy(null)).toEqual(DEFAULT_VENUE_BOOKING_POLICY);
    expect(getEffectiveVenueBookingPolicy({ slotIntervalMinutes: 90 })).toEqual(
      DEFAULT_VENUE_BOOKING_POLICY
    );
    const bad = validateVenueBookingPolicy({ slotIntervalMinutes: 60 });
    expect(bad.ok).toBe(false);
  });

  it("1h interval preview (hourly start off)", () => {
    const v = validateVenueBookingPolicy({
      schemaVersion: 1,
      slotIntervalMinutes: 60,
      minBookingMinutes: 60,
      maxBookingMinutes: 60,
      defaultBookingMinutes: 60,
      allowHourlyStart: false,
      allowConsecutiveSlots: false,
      dayStart: "06:00",
      dayEnd: "10:00",
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const slots = previewSlotsFromPolicy(v.policy);
    expect(slots.map((s) => `${s.startTime}-${s.endTime}`)).toEqual([
      "06:00-07:00",
      "07:00-08:00",
      "08:00-09:00",
      "09:00-10:00",
    ]);
  });

  it("2h + allowHourlyStart generates overlapping starts", () => {
    const v = validateVenueBookingPolicy({
      ...DEFAULT_VENUE_BOOKING_POLICY,
      allowHourlyStart: true,
      dayStart: "06:00",
      dayEnd: "10:00",
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const labels = previewSlotsFromPolicy(v.policy).map((s) => `${s.startTime}-${s.endTime}`);
    expect(labels).toEqual(["06:00-08:00", "07:00-09:00", "08:00-10:00"]);
  });

  it("intervalsOverlap detects 06-08 vs 07-09", () => {
    expect(intervalsOverlap("06:00", "08:00", "07:00", "09:00")).toBe(true);
    expect(intervalsOverlap("06:00", "08:00", "08:00", "10:00")).toBe(false);
    expect(intervalsOverlap("06:00", "08:00", "08:00", "10:00")).toBe(false);
  });

  it("booking length independent of slot: 60 grid + min120 max180 → 2h or 3h", () => {
    const v = validateVenueBookingPolicy({
      schemaVersion: 1,
      slotIntervalMinutes: 60,
      minBookingMinutes: 120,
      maxBookingMinutes: 180,
      defaultBookingMinutes: 120,
      allowHourlyStart: true,
      allowConsecutiveSlots: true,
      dayStart: "06:00",
      dayEnd: "22:00",
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(listAllowedBookingDurations(v.policy)).toEqual([120, 180]);
    expect(v.policy.defaultBookingMinutes).toBe(120);
  });

  it("missing defaultBookingMinutes is filled from allowed (compat)", () => {
    const v = validateVenueBookingPolicy({
      ...DEFAULT_VENUE_BOOKING_POLICY,
      defaultBookingMinutes: undefined,
    });
    // spread still has default — simulate older doc without field
    const oldDoc = {
      schemaVersion: 1,
      slotIntervalMinutes: 120,
      minBookingMinutes: 120,
      maxBookingMinutes: 120,
      allowHourlyStart: false,
      allowConsecutiveSlots: false,
      dayStart: "06:00",
      dayEnd: "22:00",
    };
    const filled = validateVenueBookingPolicy(oldDoc);
    expect(filled.ok).toBe(true);
    if (!filled.ok) return;
    expect(filled.policy.defaultBookingMinutes).toBe(120);
    void v;
  });

  it("slot 120 + min120 max360 → 2·4·6h (not 3h)", () => {
    const v = validateVenueBookingPolicy({
      ...DEFAULT_VENUE_BOOKING_POLICY,
      minBookingMinutes: 120,
      maxBookingMinutes: 360,
      allowConsecutiveSlots: true,
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(listAllowedBookingDurations(v.policy)).toEqual([120, 240, 360]);
  });

  it("slot 120 + min 180 alone is invalid (no achievable duration)", () => {
    const v = validateVenueBookingPolicy({
      ...DEFAULT_VENUE_BOOKING_POLICY,
      minBookingMinutes: 180,
      maxBookingMinutes: 180,
    });
    expect(v.ok).toBe(false);
  });
});
