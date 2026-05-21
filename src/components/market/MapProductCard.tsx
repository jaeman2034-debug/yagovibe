/**
 * 🔥 EXP-3: 지도 마커 클릭 시 표시되는 상품 카드 컴포넌트
 * 
 * 절대 위치 배치 방식으로 구현
 * - 클릭 이벤트 처리 용이
 * - 스타일링 자유도 높음
 * - 애니메이션 추가 가능
 */

import { useEffect, useRef } from "react";
import type { MarketProduct } from "@/types/market";

interface MapProductCardProps {
  product: MarketProduct;
  position: { lat: number; lng: number };
  map: google.maps.Map | null;
  onClose: () => void;
  onDetailClick: (product: MarketProduct) => void;
}

export default function MapProductCard({
  product,
  position,
  map,
  onClose,
  onDetailClick,
}: MapProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 🔥 ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // 🔥 지도 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // 지도 영역 클릭은 무시 (지도 인터랙션 방해 방지)
        const target = e.target as HTMLElement;
        if (target.closest('.gm-style')) {
          return;
        }
        onClose();
      }
    };
    // 약간의 지연 후 리스너 추가 (카드 렌더링 후)
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // 🔥 서비스 타입 라벨
  const getServiceLabel = () => {
    if (product.serviceType === "free") return "나눔";
    if (product.serviceType === "lost") return "유실물";
    return "중고거래";
  };

  const getServiceColor = () => {
    if (product.serviceType === "free") return "bg-green-100 text-green-700";
    if (product.serviceType === "lost") return "bg-orange-100 text-orange-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div
      ref={cardRef}
      className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-[10001]"
      style={{ maxHeight: "calc(100vh - 200px)" }}
    >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors z-10"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 썸네일 */}
        {(product.imageUrl || product.image) && (
          <div className="w-full h-40 overflow-hidden bg-gray-100">
            <img
              src={product.imageUrl || product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 내용 */}
        <div className="p-4">
          {/* 서비스 타입 라벨 */}
          <div className="mb-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getServiceColor()}`}>
              {getServiceLabel()}
            </span>
          </div>

          {/* 제목 */}
          <h3 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>

          {/* 위치 */}
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">
              {product.locationText || product.address || (product.latitude != null && product.longitude != null ? "위치 정보 없음" : "위치 정보 없음 (지도 표시 불가)")}
            </span>
          </p>

          {/* 가격 */}
          {product.price && (
            <p className="text-blue-600 font-semibold text-base mb-3">
              {product.price.toLocaleString()}원
            </p>
          )}

          {/* 상세보기 버튼 */}
          <button
            type="button"
            onClick={() => onDetailClick(product)}
            className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            상세보기
          </button>
        </div>
      </div>
  );
}

