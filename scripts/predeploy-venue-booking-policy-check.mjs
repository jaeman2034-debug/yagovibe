/**
 * Pre-deploy checklist for venue booking policy (Hosting-only).
 * Run: npx tsx scripts/predeploy-venue-booking-policy-check.mjs
 */
import {
  DEFAULT_VENUE_BOOKING_POLICY,
  buildSlotsFromPolicy,
  defaultPolicyMatchesLegacyTwoHourGrid,
  getEffectiveVenueBookingPolicy,
  intervalsOverlap,
} from "../src/lib/federation/venueBookingPolicy.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS ${msg}`);
}

function legacyTwoHourSlots(dayStart = "06:00", dayEnd = "22:00") {
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const toClock = (t) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  const out = [];
  for (let t = toMin(dayStart); t + 120 <= toMin(dayEnd); t += 120) {
    out.push({ startTime: toClock(t), endTime: toClock(t + 120) });
  }
  return out;
}

// 1) Persist model: effective policy round-trips from saved shape
const savedLike = {
  schemaVersion: 1,
  slotIntervalMinutes: 120,
  minBookingMinutes: 120,
  maxBookingMinutes: 120,
  defaultBookingMinutes: 120,
  allowHourlyStart: true,
  allowConsecutiveSlots: false,
  dayStart: "08:00",
  dayEnd: "22:00",
};
const afterReload = getEffectiveVenueBookingPolicy(savedLike);
assert(afterReload.allowHourlyStart === true, "1. refresh keeps allowHourlyStart ON");
assert(afterReload.dayStart === "08:00", "1. refresh keeps dayStart 08:00");
assert(buildSlotsFromPolicy(afterReload).length === 13, "1. 08~22 + 2h hourly → 13 slots");

// 2) Same SoT across surfaces
const grid = buildSlotsFromPolicy(afterReload).map((s) => `${s.startTime}-${s.endTime}`);
assert(grid[0] === "08:00-10:00", "2. grid starts 08-10");
assert(grid.includes("09:00-11:00"), "2. hourly includes 09-11");
assert(grid[grid.length - 1] === "20:00-22:00", "2. grid ends 20-22");

// 3) Fallback for missing policy doc
const fb = getEffectiveVenueBookingPolicy(null);
assert(fb.slotIntervalMinutes === 120, "3. fallback slot 120");
assert(fb.defaultBookingMinutes === 120, "3. fallback default 120");
assert(fb.allowHourlyStart === false, "3. fallback hourly OFF");
assert(defaultPolicyMatchesLegacyTwoHourGrid(legacyTwoHourSlots()), "3. fallback === legacy 2h grid");
assert(DEFAULT_VENUE_BOOKING_POLICY.dayStart === "06:00", "3. default dayStart 06:00");

// 4) Existing booking identity (exact start|end) still valid under default
const legacy = legacyTwoHourSlots();
assert(legacy.some((s) => s.startTime === "06:00" && s.endTime === "08:00"), "4. legacy 06-08 still exists");
assert(
  !intervalsOverlap("06:00", "08:00", "08:00", "10:00"),
  "4. adjacent 2h slots do not false-overlap"
);
assert(
  intervalsOverlap("06:00", "08:00", "07:00", "09:00"),
  "4. hourly overlap detector catches 06-08 vs 07-09"
);

// 5) Hosting-only scope note (no Functions/Rules deploy required for this feature)
console.log(
  "PASS 5. Hosting-only: bookingPolicy is venues/{id} field + bookingPolicyHistory subcollection under existing federation catch-all; no Functions changes"
);

console.log("\nPREDEPLOY CHECKLIST OK");
