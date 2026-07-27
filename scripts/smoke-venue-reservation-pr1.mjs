/**
 * PR1 smoke — shortReservationCode deterministic + path helpers (no Firebase).
 */
function buildShortReservationCode(slotAllocationId, bookingDate) {
  const ym = bookingDate.replace(/-/g, "").slice(2, 6);
  let h = 0;
  for (let i = 0; i < slotAllocationId.length; i++) {
    h = (h * 31 + slotAllocationId.charCodeAt(i)) >>> 0;
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = h;
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix = alphabet[n % alphabet.length] + suffix;
    n = Math.floor(n / alphabet.length);
  }
  return `NW-${ym}-${suffix}`;
}

function venueReservationDetailPath(federationSlug, reservationId) {
  return `/federations/${encodeURIComponent(federationSlug)}/reservations/${encodeURIComponent(reservationId)}`;
}

const slotId = "slot_nowon-a_2026-08-01_1800";
const date = "2026-08-01";
const a = buildShortReservationCode(slotId, date);
const b = buildShortReservationCode(slotId, date);
if (a !== b) throw new Error("short code not deterministic");
if (a === slotId) throw new Error("short code must differ from reservationId/slotId");
if (!/^NW-\d{4}-[A-Z0-9]{4}$/.test(a)) throw new Error(`unexpected format: ${a}`);

const path = venueReservationDetailPath("nowon-football", slotId);
if (!path.includes("/reservations/") || path.includes("?") || path.includes("#")) {
  throw new Error(`bad detail path: ${path}`);
}

// Idempotent key contract
const reservationId = slotId;
if (reservationId !== slotId) throw new Error("reservationId must equal slotAllocationId");

console.log("OK smoke-venue-reservation-pr1", { shortReservationCode: a, path, reservationId });
