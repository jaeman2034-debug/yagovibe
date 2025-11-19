// src/pages/market/ProductCard.tsx

import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketProduct } from "@/types/market";
import { formatDistance } from "@/utils/formatDistance";
import { getSmartScore } from "@/utils/smartScore";
import { getRecommendReasons } from "@/utils/recommendationReasons";

type Props = {
  product: MarketProduct;
  distanceKm?: number;
  sortMode?: "latest" | "nearest" | "smart";
};

const ProductCard = memo(function ProductCard({ product, distanceKm, sortMode }: Props) {
  const navigate = useNavigate();

  const {
    id,
    name,
    price,
    imageUrl,
    images,
    gallery,
    category,
    location,
    region,
    latitude,
    longitude,
  } = product;

  const allImages = [...(images || []), ...(gallery || [])];
  const thumbnail =
    (allImages.length > 0 && typeof allImages[0] === "string")
      ? allImages[0]
      : (typeof imageUrl === "string" && imageUrl.length > 0)
      ? imageUrl
      : "/placeholder-image.png";

  const prettyPrice =
    typeof price === "number"
      ? price.toLocaleString("ko-KR") + "원"
      : "가격 미정";

  const hasCoords = latitude != null && longitude != null;
  
  // 행정동 표시 (MarketPage에서 미리 변환된 dong 필드 사용)
  const dongDisplay = product.dong || location || region || "위치 정보 없음";

  // 추천 이유 계산
  const recommendationReasons = useMemo(() => {
    if (sortMode !== "smart") return [];
    
    const smartScore = getSmartScore(product, distanceKm ?? null);
    
    if (smartScore < 0.7) return []; // 0.7 이상일 때만 표시
    
    return getRecommendReasons(product, distanceKm ?? null);
  }, [sortMode, product, distanceKm]);

  const handleClick = () => {
    navigate(`/app/market/${id}`);
  };

  const isRecommended = sortMode === "smart" && recommendationReasons.length > 0;

  return (
    <article
      onClick={handleClick}
      className={`product-card group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isRecommended
          ? "border-blue-200 ring-1 ring-blue-200"
          : "border-slate-200"
      }`}
    >
      {/* 추천 뱃지 */}
      {isRecommended && (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white">
          추천
        </div>
      )}

      {/* 썸네일 */}
      <div className="product-thumb relative">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="thumb-img"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            이미지 없음
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="product-info">
        <h2 className="product-title">
          {name}
        </h2>

        <p className="product-price">
          {prettyPrice}
        </p>

        {/* AI 한줄 요약 (리스트용) */}
        {product.aiOneLine && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
            {product.aiOneLine}
          </p>
        )}

        {/* 추천 태그 (상단) */}
        {sortMode === "smart" && recommendationReasons.length > 0 && (
          <div className="recommend-tag-container">
            {recommendationReasons.map((reason, idx) => (
              <span key={idx} className="recommend-tag">
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* 위치 및 거리 정보 */}
        <div className="product-location-group">
          {product.dong ? (
            <div className="flex items-center gap-1 text-gray-600">
              <span className="text-[13px]">📍</span>
              <span className="location-text font-medium">{dongDisplay}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[13px]">📍</span>
              <span className="location-text">위치 정보 없음</span>
            </div>
          )}
          {typeof distanceKm === "number" && hasCoords && (
            <div className="flex items-center gap-1 text-green-700">
              <span className="text-[13px]">❤️</span>
              <span className="distance-text">{formatDistance(distanceKm)}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

export default ProductCard;
