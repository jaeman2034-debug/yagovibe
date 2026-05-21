/**
 * 🔥 EXP-3: Google Maps 네이티브 OverlayView를 사용한 커스텀 카드
 * 
 * 마커 위에 정확히 배치되는 오버레이
 * - Google Maps 좌표 → 픽셀 변환 자동 처리
 * - 지도 이동/줌 시 자동 업데이트
 * - React 컴포넌트를 DOM에 렌더링
 */

import { useEffect, useRef } from "react";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import type { MarketProduct } from "@/types/market";

interface MapOverlayCardProps {
  product: MarketProduct;
  position: { lat: number; lng: number };
  map: any; // 🔥 google.maps.Map 대신 any로 변경 (타입 체크는 런타임에서)
  onClose: () => void;
  onDetailClick: (product: MarketProduct) => void;
}

// 🔥 클래스를 함수 내부에서 동적으로 생성 (google 로드 후에만 실행)
function createProductCardOverlayClass(googleMaps: any) {
  class ProductCardOverlay extends googleMaps.OverlayView {
    private product: MarketProduct;
    private position: any; // 🔥 google.maps.LatLng 대신 any 사용
    private container: HTMLDivElement;
    private onClose: () => void;
    private onDetailClick: (product: MarketProduct) => void;
    private root: Root | null = null;

    constructor(
      product: MarketProduct,
      position: { lat: number; lng: number },
      onClose: () => void,
      onDetailClick: (product: MarketProduct) => void
    ) {
      super();
      this.product = product;
      this.position = new googleMaps.LatLng(position.lat, position.lng);
      this.onClose = onClose;
      this.onDetailClick = onDetailClick;

    // 컨테이너 생성
    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.pointerEvents = "auto";
  }

  onAdd(): void {
    const panes = this.getPanes();
    if (panes && panes.overlayMouseTarget) {
      panes.overlayMouseTarget.appendChild(this.container);
    }
  }

  draw(): void {
    const projection = this.getProjection();
    if (!projection) return;

    const point = projection.fromLatLngToDivPixel(this.position);
    if (!point) return;

    // 마커 위에 정확히 배치 (-translate-x-1/2 -translate-y-full)
    this.container.style.left = `${point.x}px`;
    this.container.style.top = `${point.y}px`;
    this.container.style.transform = "translate(-50%, -100%)";
    this.container.style.marginBottom = "8px";
  }

  onRemove(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  render(component: React.ReactElement): void {
    if (!this.root) {
      this.root = createRoot(this.container);
    }
    this.root.render(component);
  }
  }

  return ProductCardOverlay;
}

export default function MapOverlayCard({
  product,
  position,
  map,
  onClose,
  onDetailClick,
}: MapOverlayCardProps) {
  const overlayRef = useRef<any>(null); // 🔥 동적 클래스이므로 any로 변경

  useEffect(() => {
    // 🔥 핵심 방어: google이 로드되지 않았으면 아무것도 하지 않음
    if (typeof window === "undefined") return;
    
    const googleMaps = (window as any).google?.maps;
    if (!googleMaps || !map) return;

    // 🔥 google이 로드된 후에만 클래스 생성 및 사용
    const ProductCardOverlayClass = createProductCardOverlayClass(googleMaps);

    // OverlayView 생성
    const overlay = new ProductCardOverlayClass(
      product,
      position,
      onClose,
      onDetailClick
    );
    overlay.setMap(map);
    overlayRef.current = overlay;

    // React 컴포넌트 렌더링
    overlay.render(
      <MapItemCardContent
        product={product}
        onClose={onClose}
        onDetailClick={onDetailClick}
      />
    );

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, product, position, onClose, onDetailClick]);

  return null; // 이 컴포넌트는 DOM에 직접 렌더링하지 않음
}

// 🔥 카드 내용 컴포넌트 (OverlayView 내부에 렌더링)
function MapItemCardContent({
  product,
  onClose,
  onDetailClick,
}: {
  product: MarketProduct;
  onClose: () => void;
  onDetailClick: (product: MarketProduct) => void;
}) {
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
    <div className="w-64 rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors z-10"
        aria-label="닫기"
      >
        ✕
      </button>

      {/* 썸네일 */}
      {(product.imageUrl || product.image) && (
        <div className="h-32 bg-gray-100 overflow-hidden">
          <img
            src={product.imageUrl || product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 내용 */}
      <div className="p-3">
        {/* 서비스 타입 라벨 */}
        <div className="mb-2">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getServiceColor()}`}>
            {getServiceLabel()}
          </span>
        </div>

        {/* 제목 */}
        <div className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
          {product.name}
        </div>

        {/* 위치 */}
        <div className="mt-1 text-xs text-gray-500 line-clamp-1">
          {product.locationText || product.address || "위치 정보 없음"}
        </div>

        {/* 가격/타입 */}
        <div className="mt-2 text-xs text-gray-600">
          {product.serviceType === "free" && "무료 나눔"}
          {product.serviceType === "lost" && "유실물"}
          {product.serviceType !== "free" && product.serviceType !== "lost" && product.price && (
            <span className="text-blue-600 font-semibold">
              {product.price.toLocaleString()}원
            </span>
          )}
        </div>

        {/* 상세보기 버튼 */}
        <button
          type="button"
          onClick={() => onDetailClick(product)}
          className="mt-2 w-full h-9 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all"
        >
          상세 보기
        </button>
      </div>
    </div>
  );
}

