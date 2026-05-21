/**
 * 거래 예약 액션 버튼 (예약, 취소, 상품 보기)
 */

import { useNavigate } from "react-router-dom";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

type Props = {
  productId?: string;
  productStatus?: "ACTIVE" | "SOLD" | "DELETED" | "RESERVED";
  isSeller?: boolean;
  isReservationLoading?: boolean;
  onReserve?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export function ReservationActions({
  productId,
  productStatus,
  isSeller = false,
  isReservationLoading = false,
  onReserve,
  onCancel,
}: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
      {isSeller && productStatus === "ACTIVE" && onReserve && (
        <button
          type="button"
          onClick={onReserve}
          disabled={isReservationLoading}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: isReservationLoading ? "#9ca3af" : "#F59E0B",
            border: "none",
            borderRadius: 8,
            cursor: isReservationLoading ? "not-allowed" : "pointer",
            padding: "8px 14px",
            flexShrink: 0,
            transition: "all 0.2s",
            opacity: isReservationLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isReservationLoading) e.currentTarget.style.background = "#D97706";
          }}
          onMouseLeave={(e) => {
            if (!isReservationLoading) e.currentTarget.style.background = "#F59E0B";
          }}
        >
          {isReservationLoading ? "예약 중..." : "🔒 예약"}
        </button>
      )}

      {isSeller && productStatus === "RESERVED" && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isReservationLoading}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: isReservationLoading ? "#9ca3af" : "#3B82F6",
            border: "none",
            borderRadius: 8,
            cursor: isReservationLoading ? "not-allowed" : "pointer",
            padding: "8px 14px",
            flexShrink: 0,
            transition: "all 0.2s",
            opacity: isReservationLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isReservationLoading) e.currentTarget.style.background = "#2563EB";
          }}
          onMouseLeave={(e) => {
            if (!isReservationLoading) e.currentTarget.style.background = "#3B82F6";
          }}
        >
          {isReservationLoading ? "취소 중..." : "🔓 취소"}
        </button>
      )}

      {productStatus === "ACTIVE" && productId ? (
        <button
          type="button"
          onClick={() => navigate(sportMarketDetailUrl(resolveLastSportId(), productId!))}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#2563EB",
            background: "transparent",
            border: "1px solid #2563EB",
            borderRadius: 8,
            cursor: "pointer",
            padding: "8px 14px",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#EFF6FF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          상품 보기
        </button>
      ) : (
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#9ca3af",
            padding: "8px 14px",
            flexShrink: 0,
          }}
        >
          {productStatus === "SOLD" ? "판매 완료" : productStatus === "RESERVED" ? "예약됨" : "판매 종료"}
        </div>
      )}
    </div>
  );
}
