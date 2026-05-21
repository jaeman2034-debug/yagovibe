import type { ReactNode } from "react";

/**
 * 상품 요약 카드 (채팅 헤더용)
 */

type Props = {
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
  productImages?: string[];
  productStatus?: "ACTIVE" | "SOLD" | "DELETED" | "RESERVED";
  productMissing?: boolean;
  /** 액션 버튼 영역 (예약/취소/상품 보기) */
  actions?: ReactNode;
};

export function ProductInfo({
  productTitle,
  productPrice,
  productImage,
  productImages,
  productMissing = false,
  actions,
}: Props) {
  const imageUrl = productImages?.[0] || productImage;

  // 상품 정보 없음
  if (productMissing && !productTitle) {
    return (
      <div
        style={{
          padding: "10px 16px",
          background: "#F9FAFB",
          color: "#6b7280",
          fontSize: 13,
          borderTop: "1px solid #e5e7eb",
          lineHeight: 1.5,
        }}
      >
        이 상품은 더 이상 판매 중이 아니에요. 대화는 계속할 수 있어요.
      </div>
    );
  }

  // 삭제된 상품 (스냅샷 있음)
  if (productMissing && productTitle) {
    return (
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "12px 16px",
          borderTop: "1px solid #e5e7eb",
          background: "#F9FAFB",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            overflow: "hidden",
            background: "#e5e7eb",
            flexShrink: 0,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="상품"
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: 20,
              }}
            >
              📦
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6b7280",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: 4,
            }}
          >
            {productTitle}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {productPrice != null && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                {productPrice.toLocaleString("ko-KR")}원
              </div>
            )}
            <span
              style={{
                fontSize: 11,
                color: "#991B1B",
                background: "#FEE2E2",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              판매 종료
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>
            이 상품은 더 이상 판매 중이 아니에요. 대화는 계속할 수 있어요.
          </div>
        </div>
      </div>
    );
  }

  // 정상 상품
  if (!productTitle) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 16px",
        borderTop: "1px solid #e5e7eb",
        background: "#fff",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          overflow: "hidden",
          background: "#e5e7eb",
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="상품"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 24,
            }}
          >
            📦
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 6,
            lineHeight: 1.4,
          }}
        >
          {productTitle}
        </div>
        {productPrice != null && (
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            {productPrice.toLocaleString("ko-KR")}원
          </div>
        )}
      </div>
      {actions}
    </div>
  );
}
