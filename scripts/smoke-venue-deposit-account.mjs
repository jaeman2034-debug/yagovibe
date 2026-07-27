/**
 * Hot-fix smoke — Nowon venue deposit account resolution (no Firebase).
 */
function isSuraksanVenue(venueId, venueName) {
  const id = (venueId || "").toLowerCase();
  const name = venueName || "";
  return id.includes("suraksan") || name.includes("수락산");
}

function nowonOpsDepositFallback(federationSlug, venueId, venueName) {
  if (federationSlug !== "nowon-football") return null;
  if (isSuraksanVenue(venueId, venueName)) {
    return "국민은행\n278501-04-116237\n수락산구장 전용";
  }
  return "국민은행\n536201-01-485137\n노원구축구협회";
}

const surak = nowonOpsDepositFallback("nowon-football", "nowon-suraksan", "수락산구장");
const madeul = nowonOpsDepositFallback("nowon-football", "nowon-madeul", "마들구장");
if (!surak.includes("278501-04-116237")) throw new Error("suraksan account mismatch");
if (!madeul.includes("536201-01-485137")) throw new Error("federation account mismatch");
if (surak === madeul) throw new Error("suraksan must differ from federation default");
console.log("OK smoke-venue-deposit-account", { surak: surak.split("\n")[1], madeul: madeul.split("\n")[1] });
