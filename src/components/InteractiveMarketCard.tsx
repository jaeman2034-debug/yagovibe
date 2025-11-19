import React from "react";
import type { MarketProduct } from "@/types/market";

interface Props {
  product: MarketProduct;
}

const InteractiveMarketCard: React.FC<Props> = ({ product }) => {
  return (
    <div className="flex items-center bg-white shadow-md rounded-xl p-3 mb-3 hover:shadow-lg transition-shadow duration-200">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs">no image</div>
        )}
      </div>

      <div className="ml-4 flex flex-col justify-between flex-1 h-full">
        <div>
          <h3 className="text-base font-semibold truncate">{product.name}</h3>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {typeof product.price === "number" ? `${product.price.toLocaleString()}원` : "가격 미정"}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          KR · {product.location || "위치 정보없음"} · {product.timeAgo || "방금 전"}
        </p>
      </div>
    </div>
  );
};

export default InteractiveMarketCard;
export type { MarketProduct };

