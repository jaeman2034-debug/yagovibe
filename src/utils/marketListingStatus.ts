/**
 * 중고 마켓 게시글 거래 상태 — Firestore 값(active/open/reserved/done 등)을 UI 3단계로 정규화
 */

export type NormalizedListingStatus = "active" | "reserved" | "sold";

export function normalizeMarketListingStatus(
  raw: string | undefined | null
): NormalizedListingStatus {
  const s = (raw ?? "active").toLowerCase().trim();
  if (["sold", "done", "completed", "closed", "hidden"].includes(s)) {
    return "sold";
  }
  if (["reserved", "holding"].includes(s)) {
    return "reserved";
  }
  return "active";
}

export function getMarketListingStatusMeta(status: NormalizedListingStatus): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case "reserved":
      return {
        label: "예약중",
        badgeClass: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
        dotClass: "text-amber-500",
      };
    case "sold":
      return {
        label: "판매완료",
        badgeClass: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
        dotClass: "text-gray-400",
      };
    default:
      return {
        label: "판매중",
        badgeClass: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70",
        dotClass: "text-emerald-500",
      };
  }
}
