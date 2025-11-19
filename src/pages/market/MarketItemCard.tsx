import React from "react";

interface MarketItemCardProps {
  imageUrl: string;
  name: string;
  category: string;
  price: number | string;
  location?: string;
  onClick?: () => void;
}

export default function MarketItemCard({
  imageUrl,
  name,
  category,
  price,
  location,
  onClick,
}: MarketItemCardProps) {
  const priceValue = typeof price === "number" ? price : parseInt(price?.toString() || "0", 10);
  const formattedPrice = priceValue > 0 ? new Intl.NumberFormat("ko-KR").format(priceValue) : "가격 미정";

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <img
          src={imageUrl || "https://via.placeholder.com/150"}
          alt={name || "상품 이미지"}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-gray-800 truncate">{name || "상품명 없음"}</h3>
        <p className="text-xs text-gray-500">{category || "카테고리 없음"}</p>

        <div className="flex items-center justify-between">
          <p className="text-green-600 font-bold text-sm">{formattedPrice}원</p>
          <p className="text-xs text-gray-400">{location || "위치 정보 없음"}</p>
        </div>
      </div>
    </div>
  );
}

