// src/components/market/RecommendedSection.tsx
// 🔥 마켓 상단 추천 섹션 (가로 스크롤, 작은 카드)
// 규칙: 탐색 UX = 가로 스크롤, 작은 카드, 최대 6~10개

import { useNavigate } from "react-router-dom";
import type { MarketProduct } from "@/types/market";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";
import ProductCard from "../../pages/market/ProductCard";

interface RecommendedSectionProps {
  products: MarketProduct[];
  title?: string;
  isLoading?: boolean;
}

export default function RecommendedSection({
  products,
  title = "🔥 이 지역에서 인기",
  isLoading = false,
}: RecommendedSectionProps) {
  const navigate = useNavigate();

  // 🔥 추천 0개면 섹션 숨김
  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <div className="recommended-container">
      <div className="recommended-section">
      <h3 className="section-title">
        {title}
      </h3>

      {isLoading ? (
        <div className="recommended-scroll">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="recommended-card flex-shrink-0 w-[120px] h-48 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : (
        <div className="recommended-scroll">
          {products.slice(0, 6).map((product) => {
            const imageUrl = 
              (product.images && product.images.length > 0 && typeof product.images[0] === "string")
                ? product.images[0]
                : (typeof product.imageUrl === "string" && product.imageUrl.length > 0)
                ? product.imageUrl
                : "/placeholder-image.png";
            
            const price = typeof product.price === "number" 
              ? product.price.toLocaleString() 
              : "가격 미정";

            return (
              <div
                key={product.id}
                className="popular-card"
                onClick={() =>
                  navigate(
                    sportMarketDetailUrl(
                      (product as MarketProduct & { sport?: string }).sport || resolveLastSportId(),
                      product.id
                    )
                  )
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(
                      sportMarketDetailUrl(
                        (product as MarketProduct & { sport?: string }).sport || resolveLastSportId(),
                        product.id
                      )
                    );
                  }
                }}
              >
                <img
                  src={imageUrl}
                  alt={product.name || "상품 이미지"}
                  className="popular-image"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-image.png";
                  }}
                />
                <div className="popular-title">
                  {product.name || "상품명 없음"}
                </div>
                <div className="popular-price">
                  {price}원
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

