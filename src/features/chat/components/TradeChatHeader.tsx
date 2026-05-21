/**
 * 중고거래 채팅 헤더 (상품 카드 + 예약 액션)
 */

import { useNavigate } from "react-router-dom";
import { ProductInfo } from "./ProductInfo";
import { ReservationActions } from "./ReservationActions";

type Props = {
  product?: {
    id: string;
    title: string;
    price?: number;
    images?: string[];
    imageUrl?: string;
  } | null;
  productMissing: boolean;
  sellerName?: string;
  productStatus?: "ACTIVE" | "SOLD" | "DELETED" | "RESERVED";
  isSeller?: boolean;
  onReserve?: () => void | Promise<void>;
  onCancelReserve?: () => void | Promise<void>;
  isReserving?: boolean;
};

export function TradeChatHeader({
  product,
  productMissing,
  sellerName,
  productStatus,
  isSeller = false,
  onReserve,
  onCancelReserve,
  isReserving = false,
}: Props) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "sticky",
        top: "var(--header-h, 56px)", // 🔥 모바일: 스크롤 시에도 상단 네비 아래에 붙도록 (가림 방지)
        zIndex: 10,
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* 상단: 뒤로가기 + 제목 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 20,
            cursor: "pointer",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="뒤로"
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {product?.title ?? "채팅"}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {sellerName
              ? `${sellerName} · ${productMissing ? "판매 종료" : "거래중"}`
              : productMissing
                ? "판매 종료"
                : "거래중"}
          </div>
        </div>
      </div>

      {/* 상품 카드 + 액션 */}
      <ProductInfo
        productTitle={product?.title}
        productPrice={product?.price}
        productImage={product?.imageUrl}
        productImages={product?.images}
        productMissing={productMissing}
        actions={
          product ? (
            <ReservationActions
              productId={product.id}
              productStatus={productStatus}
              isSeller={isSeller}
              isReservationLoading={isReserving}
              onReserve={onReserve}
              onCancel={onCancelReserve}
            />
          ) : undefined
        }
      />
    </div>
  );
}
