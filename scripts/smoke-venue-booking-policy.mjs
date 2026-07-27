/**
 * Lightweight smoke (no vitest / no @ path) for venueBookingPolicy P0.
 * Run: npx tsx scripts/smoke-venue-booking-policy.mjs
 */
import {
  DEFAULT_VENUE_BOOKING_POLICY,
  defaultPolicyMatchesLegacyTwoHourGrid,
  diffVenueBookingPolicy,
  getEffectiveVenueBookingPolicy,
  intervalsOverlap,
  listAllowedBookingDurations,
  buildSlotsFromPolicy,
  toVenueBookingPolicySnapshot,
  validateVenueBookingPolicy,
} from "../src/lib/federation/venueBookingPolicy.ts";

/** Inline legacy 2h grid — same as buildTwoHourSlots / VENUE_SLOT_INTERVAL=120 */
function buildLegacyTwoHourSlots(dayStart = "06:00", dayEnd = "22:00") {
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const toClock = (t) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  const start = toMin(dayStart);
  const end = toMin(dayEnd);
  const out = [];
  for (let t = start; t + 120 <= end; t += 120) {
    out.push({ startTime: toClock(t), endTime: toClock(t + 120) });
  }
  return out;
}

const legacy = buildLegacyTwoHourSlots();
const checks = [];
checks.push(["legacyMatch", defaultPolicyMatchesLegacyTwoHourGrid(legacy)]);
checks.push(["fallback120", getEffectiveVenueBookingPolicy(null).slotIntervalMinutes === 120]);
checks.push([
  "invalidFallsBack",
  getEffectiveVenueBookingPolicy({ slotIntervalMinutes: 90 }).slotIntervalMinutes === 120,
]);

const h1 = validateVenueBookingPolicy({
  schemaVersion: 1,
  slotIntervalMinutes: 60,
  minBookingMinutes: 60,
  maxBookingMinutes: 60,
  allowHourlyStart: false,
  allowConsecutiveSlots: false,
  dayStart: "06:00",
  dayEnd: "10:00",
});
checks.push([
  "1hPreview",
  h1.ok &&
    buildSlotsFromPolicy(h1.policy)
      .map((s) => `${s.startTime}-${s.endTime}`)
      .join(",") === "06:00-07:00,07:00-08:00,08:00-09:00,09:00-10:00",
]);

const hourly = validateVenueBookingPolicy({
  ...DEFAULT_VENUE_BOOKING_POLICY,
  allowHourlyStart: true,
  dayStart: "06:00",
  dayEnd: "10:00",
});
checks.push([
  "hourly2h",
  hourly.ok &&
    buildSlotsFromPolicy(hourly.policy)
      .map((s) => `${s.startTime}-${s.endTime}`)
      .join(",") === "06:00-08:00,07:00-09:00,08:00-10:00",
]);

const sameGrid =
  JSON.stringify(buildSlotsFromPolicy(DEFAULT_VENUE_BOOKING_POLICY).map((s) => `${s.startTime}|${s.endTime}`)) ===
  JSON.stringify(
    buildSlotsFromPolicy(getEffectiveVenueBookingPolicy(null)).map((s) => `${s.startTime}|${s.endTime}`)
  );
checks.push(["adminPublicSameDefaultGrid", sameGrid]);
checks.push(["overlapYes", intervalsOverlap("06:00", "08:00", "07:00", "09:00") === true]);
checks.push(["overlapNo", intervalsOverlap("06:00", "08:00", "08:00", "10:00") === false]);

const lenIndep = validateVenueBookingPolicy({
  schemaVersion: 1,
  slotIntervalMinutes: 60,
  minBookingMinutes: 120,
  maxBookingMinutes: 180,
  allowHourlyStart: true,
  allowConsecutiveSlots: true,
  dayStart: "06:00",
  dayEnd: "22:00",
});
checks.push([
  "len2or3h",
  lenIndep.ok &&
    listAllowedBookingDurations(lenIndep.policy).join(",") === "120,180",
]);

const len246 = validateVenueBookingPolicy({
  ...DEFAULT_VENUE_BOOKING_POLICY,
  minBookingMinutes: 120,
  maxBookingMinutes: 360,
  allowConsecutiveSlots: true,
});
checks.push([
  "len246h",
  len246.ok &&
    listAllowedBookingDurations(len246.policy).join(",") === "120,240,360",
]);

checks.push([
  "nowonDefaultLen",
  listAllowedBookingDurations(DEFAULT_VENUE_BOOKING_POLICY).join(",") === "120",
]);
checks.push(["defaultBooking120", DEFAULT_VENUE_BOOKING_POLICY.defaultBookingMinutes === 120]);

const legacyNoDefault = validateVenueBookingPolicy({
  schemaVersion: 1,
  slotIntervalMinutes: 120,
  minBookingMinutes: 120,
  maxBookingMinutes: 120,
  allowHourlyStart: false,
  allowConsecutiveSlots: false,
  dayStart: "06:00",
  dayEnd: "22:00",
});
checks.push([
  "compatFillDefault",
  legacyNoDefault.ok && legacyNoDefault.policy.defaultBookingMinutes === 120,
]);

const a = toVenueBookingPolicySnapshot(DEFAULT_VENUE_BOOKING_POLICY);
const b = { ...a, slotIntervalMinutes: 60, minBookingMinutes: 60, maxBookingMinutes: 180, defaultBookingMinutes: 120 };
const diffs = diffVenueBookingPolicy(a, b);
checks.push(["diffHasInterval", diffs.some((d) => d.field === "slotIntervalMinutes" && d.from === "2시간" && d.to === "1시간")]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
process.exit(failed ? 1 : 0);
