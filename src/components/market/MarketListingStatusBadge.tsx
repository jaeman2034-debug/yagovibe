import {
  getMarketListingStatusMeta,
  normalizeMarketListingStatus,
} from "@/utils/marketListingStatus";
import { cn } from "@/lib/utils";

type Props = {
  status?: string | null;
  className?: string;
};

/** 판매중 / 예약중 / 판매완료 — 사용자용 라벨 */
export function MarketListingStatusBadge({ status, className }: Props) {
  const normalized = normalizeMarketListingStatus(status);
  const meta = getMarketListingStatusMeta(normalized);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.badgeClass,
        className
      )}
    >
      <span className={meta.dotClass} aria-hidden>
        ●
      </span>
      {meta.label}
    </span>
  );
}
