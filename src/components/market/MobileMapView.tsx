/**
 * 🔥 MobileMapView (TradeMapView) - 모바일 전용 전체 화면 지도 뷰
 * 
 * 특징:
 * - position: fixed로 전체 화면 차지
 * - 헤더/하단 네비 높이 제외
 * - 지도 위 overlay UI (검색, 버튼)
 * - 리스트 모드로 전환 버튼
 * 
 * 구조:
 * - 지도는 항상 FULL 영역 (100% height/width)
 * - 지도 위 UI는 overlay (absolute)
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OptimizedProductMap from "./OptimizedProductMap";
// ✅ DetailOverlay 제거 (라우팅 방식으로 변경)
// import DetailOverlay from "./DetailOverlay";
import type { MarketProduct } from "@/types/market";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";
import { getDistanceKm, getDriveTimeMin } from "@/utils/geo";
// ✅ useMapStore 제거 (라우팅 방식으로 변경)
// import { useMapStore } from "@/stores/mapStore";

type SheetState = "closed" | "mid" | "full"; // 🔥 UX 개선: 3단 높이 시스템 (closed/mid/full)

interface MobileMapViewProps {
  products: MarketProduct[];
  center?: { lat: number; lng: number };
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  onProductClick?: (product: MarketProduct) => void;
  onMarkerClick?: (product: MarketProduct, google: typeof google.maps, dongName?: string) => void | Promise<void>;
  onShowList: () => void; // 리스트 모드로 전환
  selectedProduct?: MarketProduct | null;
  onProductSelect?: (product: MarketProduct | null) => void;
  onMapReady?: (map: google.maps.Map) => void;
  onReloadProducts?: (center: { lat: number; lng: number }, bounds: google.maps.LatLngBounds | null, zoom?: number) => void | Promise<void>; // 🔥 지도 중심 검색 UX: 지역 재검색 (zoom 추가)
  viewMode?: "map" | "list"; // 🔥 지도 ↔ 리스트 모드 전환 UX
  onViewModeChange?: (mode: "map" | "list") => void; // 🔥 모드 변경 콜백
}

export default function MobileMapView({
  products,
  center,
  zoom = 12,
  userLocation,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onProductClick,
  onMarkerClick,
  onShowList,
  selectedProduct,
  onProductSelect,
  onMapReady,
  onReloadProducts, // 🔥 지도 중심 검색 UX
  viewMode = "map", // 🔥 지도 ↔ 리스트 모드 전환 UX: 기본값 map
  onViewModeChange, // 🔥 모드 변경 콜백
}: MobileMapViewProps) {
  // 🔥 핵심 디버깅: 렌더 추적
  console.log("[MobileMapView] render", { productsCount: products?.length || 0 });
  
  // ✅ 라우팅 방식으로 변경 (overlay 제거)
  const navigate = useNavigate();

  // 🔥 Bottom Sheet 상태 관리 (3단 높이 시스템)
  const [sheetState, setSheetState] = useState<SheetState>("mid"); // 🔥 기본값: mid (카드 미리보기)
  const startYRef = useRef<number>(0);
  const deltaYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // 🔥 지도 중심 검색 UX: 지도 이동 감지
  const [mapMoved, setMapMoved] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [currentBounds, setCurrentBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [isReloading, setIsReloading] = useState(false); // 🔥 로딩 상태
  const [autoReload, setAutoReload] = useState(true); // 🔥 자동 갱신 활성화 (기본값: true)
  const initialCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const idleDebounceTimerRef = useRef<NodeJS.Timeout | null>(null); // 🔥 debounce 타이머

  // 🔥 상품 선택 시 mid 상태로 초기화 + 지도 중심 이동 (마커-시트 동기화)
  useEffect(() => {
    if (selectedProduct && mapInstanceRef.current) {
      setSheetState("mid"); // 🔥 UX 개선: 기본값을 mid로 설정 (카드 미리보기)
      
      // 🔥 선택된 상품의 위치로 지도 중심 이동 (부드러운 애니메이션)
      const lat = selectedProduct.latitude != null ? Number(selectedProduct.latitude) : null;
      const lng = selectedProduct.longitude != null ? Number(selectedProduct.longitude) : null;
      
      if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        // 🔥 지도 padding으로 시각적 중앙이 이미 보정됨 → 마커 실제 좌표로 panTo (치우침 방지)
        const productPosition = { lat, lng };
        mapInstanceRef.current.panTo(productPosition);
        
        // 🔥 줌 레벨 조정 (상세 보기용)
        const currentZoom = mapInstanceRef.current.getZoom() || zoom;
        if (currentZoom < 15) {
          mapInstanceRef.current.setZoom(15);
        }
        
        console.log("📍 [MobileMapView] 선택된 상품 위치로 지도 이동:", productPosition, `sheetState: ${sheetState}`);
      }
    } else if (!selectedProduct) {
      // 🔥 선택 해제 시 카드 닫기
      setSheetState("closed");
    }
  }, [selectedProduct, zoom, sheetState]); // 🔥 sheetState 의존성 추가

  // 🔥 시트 상태 변경 시 지도 center 보정 (3단 높이 시스템)
  useEffect(() => {
    if (!selectedProduct || !mapInstanceRef.current) return;
    
    const lat = selectedProduct.latitude != null ? Number(selectedProduct.latitude) : null;
    const lng = selectedProduct.longitude != null ? Number(selectedProduct.longitude) : null;
    
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      const productPosition = { lat, lng };
      mapInstanceRef.current.panTo(productPosition);
      console.log("📍 [MobileMapView] 시트 상태 변경으로 지도 center 보정:", productPosition, `sheetState: ${sheetState}`);
    }
  }, [sheetState, selectedProduct]);

  // 🔥 초기 중심점 저장
  useEffect(() => {
    if (center && !initialCenterRef.current) {
      initialCenterRef.current = center;
      setCurrentCenter(center);
    }
  }, [center]);

  // 🔥 지도 인스턴스 저장 (마커-시트 동기화용)
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // 🔥 지도 이동 완료 핸들러 (debounce + 자동 갱신 + zoom 추적)
  const handleMapIdle = (newCenter: { lat: number; lng: number }, bounds: google.maps.LatLngBounds | null) => {
    // 🔥 debounce: 연속 idle 이벤트 방지 (250ms - 실서비스급)
    if (idleDebounceTimerRef.current) {
      clearTimeout(idleDebounceTimerRef.current);
    }

    idleDebounceTimerRef.current = setTimeout(async () => {
      if (!mapInstanceRef.current) return;

      const currentZoom = mapInstanceRef.current.getZoom() || zoom;
      setCurrentCenter(newCenter);
      setCurrentBounds(bounds);
      
      // 🔥 초기 중심점과 비교하여 이동 여부 판단 (약 100m 이상 이동 시)
      const hasMoved = initialCenterRef.current ? (() => {
        const distance = Math.sqrt(
          Math.pow(newCenter.lat - initialCenterRef.current!.lat, 2) +
          Math.pow(newCenter.lng - initialCenterRef.current!.lng, 2)
        );
        return distance > 0.001; // 약 0.001도 = 약 100m
      })() : true;

      if (hasMoved) {
        setMapMoved(true);
        
        // 🔥 자동 갱신 활성화 시 자동으로 상품 로드 (zoom 포함)
        if (autoReload && onReloadProducts && !isReloading) {
          try {
            setIsReloading(true);
            await onReloadProducts(newCenter, bounds, currentZoom);
            // 🔥 갱신 후 초기 중심점 업데이트
            if (initialCenterRef.current) {
              initialCenterRef.current = newCenter;
            }
            setMapMoved(false);
          } catch (error) {
            console.error("❌ [MobileMapView] 자동 지역 재검색 실패:", error);
          } finally {
            setIsReloading(false);
          }
        }
      }
    }, 250); // ✅ 실서비스급: 250ms debounce
  };

  // 🔥 cleanup: 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (idleDebounceTimerRef.current) {
        clearTimeout(idleDebounceTimerRef.current);
      }
    };
  }, []);

  // 🔥 지역 재검색 핸들러 (로딩 상태 관리)
  const handleReloadProducts = async () => {
    if (!currentCenter || !onReloadProducts || isReloading) return; // 🔥 중복 호출 방지
    
    try {
      setIsReloading(true);
      await onReloadProducts(currentCenter, null);
      setMapMoved(false);
      if (initialCenterRef.current) {
        initialCenterRef.current = currentCenter;
      }
    } catch (error) {
      console.error("❌ [MobileMapView] 지역 재검색 실패:", error);
    } finally {
      setIsReloading(false);
    }
  };

  // 🔥 드래그 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    deltaYRef.current = 0;
    isDraggingRef.current = true;
  };

  // 🔥 드래그 중
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    
    const currentY = e.touches[0].clientY;
    deltaYRef.current = currentY - startYRef.current;
    
    // 실시간 드래그 피드백 (옵션: 나중에 추가 가능)
    // const sheetElement = e.currentTarget.closest('.mobile-map-card');
    // if (sheetElement) {
    //   const baseTransform = getBaseTransform(sheetState);
    //   (sheetElement as HTMLElement).style.transform = `translateY(${baseTransform + deltaYRef.current}px)`;
    // }
  };

  // 🔥 드래그 종료 (3단 높이 시스템: closed ↔ mid ↔ full)
  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const deltaY = deltaYRef.current;
    const upThreshold = -120; // 위로 드래그 임계값 (full로)
    const downThreshold = 60; // 아래로 드래그 임계값 (closed로)

    if (deltaY < upThreshold) {
      // 위로 많이 드래그 → full 확장
      setSheetState("full");
    } else if (deltaY > downThreshold) {
      // 아래로 많이 드래그 → closed 축소
      setSheetState("closed");
    } else {
      // 임계값 미만이면 현재 상태 유지 또는 mid로 복귀
      if (sheetState === "closed") {
        setSheetState("mid");
      } else if (sheetState === "full") {
        setSheetState("mid");
      }
      // mid 상태면 그대로 유지
    }

    deltaYRef.current = 0;
  };

  // 🔥 지도 터치 시 카드 mid 상태로 (closed가 아닌 mid로 - UX 개선)
  const handleMapTouch = () => {
    if (selectedProduct && sheetState !== "closed") {
      setSheetState("mid"); // 🔥 UX 개선: closed 대신 mid로 (카드 미리보기 유지)
    }
  };

  // ✅ 구글 길찾기 함수 (현재 위치 기준)
  // 🔥 핵심: origin=Current+Location 추가 (경로 검색 가능하게 함)
  const openGoogleNavigation = (lat: number, lng: number, name?: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  // 🔥 카드 네비게이션: 다음/이전 상품 선택 (마커-시트 동기화)
  const getSelectedProductIndex = (): number => {
    if (!selectedProduct) return -1;
    return products.findIndex((p) => p.id === selectedProduct.id);
  };

  const canNavigatePrev = getSelectedProductIndex() > 0;
  const canNavigateNext = getSelectedProductIndex() < products.length - 1;

  const handleNavigateProduct = (direction: -1 | 1) => {
    const currentIndex = getSelectedProductIndex();
    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < products.length) {
      const nextProduct = products[newIndex];
      if (onProductSelect) {
        onProductSelect(nextProduct);
        // 🔥 지도 중심 이동은 useEffect에서 자동 처리됨
      }
    }
  };

  // 🔥 카드 스와이프 감지 (터치 이벤트)
  const cardSwipeStartRef = useRef<number>(0);
  const cardSwipeThreshold = 50; // 스와이프 임계값 (px)

  const handleCardSwipeStart = (e: React.TouchEvent) => {
    cardSwipeStartRef.current = e.touches[0].clientX;
  };

  const handleCardSwipeMove = (e: React.TouchEvent) => {
    // 스와이프 중에는 기본 동작 방지하지 않음 (카드 스크롤 허용)
  };

  const handleCardSwipeEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - cardSwipeStartRef.current;

    // 🔥 수평 스와이프만 처리 (세로 스크롤과 구분)
    if (Math.abs(deltaX) > cardSwipeThreshold) {
      if (deltaX > 0) {
        // 오른쪽 스와이프 → 이전 상품
        handleNavigateProduct(-1);
      } else {
        // 왼쪽 스와이프 → 다음 상품
        handleNavigateProduct(1);
      }
    }

    cardSwipeStartRef.current = 0;
  };

  // 🔥 리스트 아이템 클릭 핸들러 (지도로 복귀 + 위치 이동)
  const handleListItemClick = (product: MarketProduct) => {
    // 🔥 지도 모드로 전환
    if (onViewModeChange) {
      onViewModeChange("map");
    }
    
    // 🔥 상품 선택 (지도 중심 이동 + 마커 하이라이트)
    if (onProductSelect) {
      onProductSelect(product);
    }
    
    // 🔥 지도 중심 이동 (약간의 지연 후 실행 - 모드 전환 애니메이션 대기)
    setTimeout(() => {
      if (mapInstanceRef.current && product.latitude != null && product.longitude != null) {
        const lat = Number(product.latitude);
        const lng = Number(product.longitude);
        
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && Number.isFinite(lat) && Number.isFinite(lng)) {
          const productPosition = { lat, lng };
          mapInstanceRef.current.panTo(productPosition);
          const currentZoom = mapInstanceRef.current.getZoom();
          if (currentZoom && currentZoom < 15) {
            mapInstanceRef.current.setZoom(15);
          }
          
          console.log("📍 [MobileMapView] 리스트 클릭 → 지도 이동:", productPosition);
        }
      }
    }, 100);
  };

  // 🔥 핵심 디버깅: 렌더 추적
  useEffect(() => {
    console.log("[MobileMapView] render", {
      productsCount: products?.length || 0,
    });
  }, [products]);

  return (
    <div 
      className={`mobile-map-page mode-${viewMode}`}
      style={{
        position: "fixed",
        top: "56px", // 헤더 높이
        bottom: "64px", // 바텀네비 높이
        left: 0,
        right: 0,
        overflow: "hidden",
        background: "transparent", // 🔥 투명으로 변경 (지도가 보이도록)
        zIndex: 10,
      }}
    >
      {/* 🔥 지도 위 검색 바 fixed overlay (기존 기능 유지) */}
      <div className="mobile-searchbar-overlay">
        <div className="mobile-map-search-bar">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && searchQuery.trim() && onSearchSubmit) {
                onSearchSubmit(searchQuery);
              }
            }}
            placeholder="상품명, 태그, 브랜드 검색..."
            className="mobile-map-search-input"
          />
          {/* 🔥 지도 ↔ 리스트 토글 버튼 */}
          <button
            type="button"
            onClick={() => {
              const newMode = viewMode === "map" ? "list" : "map";
              if (onViewModeChange) {
                onViewModeChange(newMode);
              }
            }}
            className="mobile-map-mode-toggle"
            aria-label={viewMode === "map" ? "리스트 보기" : "지도 보기"}
          >
            {viewMode === "map" ? "📋" : "🗺️"}
          </button>
        </div>
      </div>

      {/* 🔥 핵심: 지도 영역 - flex:1로 남는 공간 전부 차지 (하얀 박스 방지) */}
      <div
        className="mobile-map-container"
        style={{
          position: "relative",
          width: "100%",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <OptimizedProductMap
          products={products}
          center={center || userLocation || undefined}
          zoom={zoom}
          userLocation={userLocation}
          isActive={true}
          height="100%"
          onProductClick={onProductClick}
          onMarkerClick={onMarkerClick}
          onIdle={handleMapIdle}
          selectedProductId={selectedProduct?.id || null}
          mapPadding={{ top: 80, bottom: 140, left: 0, right: 0 }}
          onMapReady={(map) => {
            // 🔥 지도 인스턴스 저장
            mapInstanceRef.current = map;

            // 🔥 지도 터치 이벤트 리스너 추가
            if (map) {
              window.google?.maps?.event?.addListener(map, "click", handleMapTouch);
              window.google?.maps?.event?.addListener(map, "dragstart", handleMapTouch);
            }
            if (onMapReady) {
              onMapReady(map);
            }
          }}
        />
      </div>

      {/* 🔥 리스트 뷰 (슬라이드 애니메이션) */}
        <div className={`mobile-list-view ${viewMode === "list" ? "visible" : ""}`}>
          <div className="mobile-list-header">
            <h2 className="mobile-list-title">상품 목록 ({products.length}개)</h2>
            <button
              type="button"
              onClick={() => {
                if (onViewModeChange) {
                  onViewModeChange("map");
                }
              }}
              className="mobile-list-close"
              aria-label="지도로 돌아가기"
            >
              ×
            </button>
          </div>
          <div className="mobile-list-content">
            {products.length === 0 ? (
              <div className="mobile-list-empty">
                <p>표시할 상품이 없습니다.</p>
              </div>
            ) : (
              products.map((product) => {
                const lat = product.latitude != null ? Number(product.latitude) : null;
                const lng = product.longitude != null ? Number(product.longitude) : null;
                const distanceKm = userLocation && lat != null && lng != null
                  ? (() => {
                      try {
                        const { getDistanceKm } = require("@/utils/geo");
                        return getDistanceKm(userLocation, { lat, lng });
                      } catch {
                        return null;
                      }
                    })()
                  : null;

                return (
                  <div
                    key={product.id}
                    className="mobile-list-item"
                    onClick={() => handleListItemClick(product)}
                  >
                    {product.imageUrl || (product as any).thumbnailUrl ? (
                      <img
                        src={product.imageUrl || (product as any).thumbnailUrl}
                        alt={product.name || (product as any).title || "상품 이미지"}
                        className="mobile-list-item-image"
                      />
                    ) : (
                      <div className="mobile-list-item-image-placeholder">📦</div>
                    )}
                    <div className="mobile-list-item-info">
                      <div className="mobile-list-item-title">
                        {product.name || (product as any).title || "상품명 없음"}
                      </div>
                      {product.price && product.price > 0 && (
                        <div className="mobile-list-item-price">
                          {product.price.toLocaleString()}원
                        </div>
                      )}
                      {distanceKm != null && !Number.isNaN(distanceKm) && (
                        <div className="mobile-list-item-distance">
                          📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
                        </div>
                      )}
                    </div>
                    <div className="mobile-list-item-arrow">›</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 🔥 선택된 상품 카드 (지도 위 overlay - Bottom Sheet) - 지도 모드일 때만 표시 */}
        {/* ✅ Sheet에 pointer-events: auto 명시 (지도 터치 차단 후 Sheet 클릭 가능) */}
        {/* 🔥 상품 미리보기: 지도 캔버스(Google 고 z-index)보다 위에 오도록 최상위 레이어 (99999 = pointer-events 차단 규칙 회피) */}
        {selectedProduct && viewMode === "map" && (
          <div 
            className={`mobile-map-card bottom-sheet ${sheetState}`}
            style={{
              pointerEvents: "auto",
              zIndex: 99999,
              isolation: "isolate"
            }}
          >
            {/* 🔥 드래그 핸들 */}
            <div
              className="sheet-handle"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            
            {/* ✅ 카드 내용 영역 (스크롤 가능 + 스와이프 네비게이션) */}
            <div
              className="mobile-map-card-content"
              onTouchStart={handleCardSwipeStart}
              onTouchMove={handleCardSwipeMove}
              onTouchEnd={handleCardSwipeEnd}
            >
              {/* 🔥 카드 네비게이션 (이전/다음 상품) */}
              {products.length > 1 && (
                <div className="card-navigation">
                  <button
                    type="button"
                    className="card-nav-btn card-nav-prev"
                    onClick={() => handleNavigateProduct(-1)}
                    disabled={!canNavigatePrev}
                    aria-label="이전 상품"
                  >
                    ‹
                  </button>
                  <span className="card-nav-indicator">
                    {getSelectedProductIndex() + 1} / {products.length}
                  </span>
                  <button
                    type="button"
                    className="card-nav-btn card-nav-next"
                    onClick={() => handleNavigateProduct(1)}
                    disabled={!canNavigateNext}
                    aria-label="다음 상품"
                  >
                    ›
                  </button>
                </div>
              )}
              {/* 🔥 상품 사진 위 우측 상단에 닫기(×) 원형 버튼 */}
              <div className="mobile-map-card-image-wrap">
                {selectedProduct.imageUrl || (selectedProduct as any).thumbnailUrl ? (
                  <img
                    src={selectedProduct.imageUrl || (selectedProduct as any).thumbnailUrl}
                    alt={selectedProduct.name || (selectedProduct as any).title || "상품 이미지"}
                    className="mobile-map-card-image"
                  />
                ) : (
                  <div className="mobile-map-card-image mobile-map-card-image-placeholder" />
                )}
                <button
                  type="button"
                  onClick={() => onProductSelect?.(null)}
                  className="mobile-map-card-close"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>
              <div className="mobile-map-card-info">
                <div className="mobile-map-card-title">
                  {selectedProduct.name || (selectedProduct as any).title || "상품명 없음"}
                </div>
                {selectedProduct.price && selectedProduct.price > 0 && (
                  <div className="mobile-map-card-price">
                    {selectedProduct.price.toLocaleString()}원
                  </div>
                )}
                {/* ✅ 거리 + 예상 시간 표시 */}
                {userLocation && selectedProduct.latitude != null && selectedProduct.longitude != null && (() => {
                  try {
                    const lat = Number(selectedProduct.latitude);
                    const lng = Number(selectedProduct.longitude);
                    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                      const distance = getDistanceKm(userLocation, { lat, lng });
                      const minutes = getDriveTimeMin(distance);
                      return (
                        <div className="mobile-map-card-distance">
                          📍 {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} · {minutes}분
                        </div>
                      );
                    }
                  } catch (error) {
                    // 거리 계산 실패 시 조용히 무시
                    return null;
                  }
                  return null;
                })()}
              </div>
              <button
                type="button"
                onClick={() => {
                  // ✅ 라우팅 방식으로 변경: 상세 페이지로 이동 (전체 화면)
                  if (selectedProduct?.id) {
                    navigate(
                      sportMarketDetailUrl(
                        (selectedProduct as MarketProduct & { sport?: string }).sport ||
                          resolveLastSportId(),
                        selectedProduct.id
                      )
                    );
                  }
                }}
                className="mobile-map-card-button"
              >
                상세 보기
              </button>
              
              {/* ✅ 구글 길찾기 버튼 */}
              {selectedProduct.latitude != null && selectedProduct.longitude != null && (
                <button
                  type="button"
                  onClick={() => {
                    const lat = Number(selectedProduct.latitude);
                    const lng = Number(selectedProduct.longitude);
                    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                      openGoogleNavigation(
                        lat,
                        lng,
                        selectedProduct.name || (selectedProduct as any).title
                      );
                    }
                  }}
                  className="mobile-map-card-button-navigation"
                >
                  🚗 길찾기
                </button>
              )}
            </div>
          </div>
        )}

      {/* 🔥 지도 중심 검색 버튼 (자동 갱신 비활성화 시 또는 수동 갱신 필요 시 표시) */}
      {mapMoved && onReloadProducts && !autoReload && (
        <div className="map-overlay-reload">
          <button
            type="button"
            onClick={handleReloadProducts}
            className={`map-search-btn map-reload-btn ${isReloading ? "loading" : ""}`}
            disabled={isReloading}
          >
            {isReloading ? (
              <>
                <span className="spinner"></span>
                검색 중...
              </>
            ) : (
              <>
                이 지역에서 검색
              </>
            )}
          </button>
        </div>
      )}

      {/* 🔥 자동 갱신 로딩 인디케이터 (자동 갱신 활성화 시) */}
      {autoReload && isReloading && (
        <div className="map-overlay-loading">
          <div className="map-loading-indicator">
            <span className="spinner"></span>
            <span>지역 검색 중...</span>
          </div>
        </div>
      )}

      {/* 🔥 지도 로딩 오버레이 (지도 이동 중 표시) - pointer-events: none으로 지도 클릭 방해 안함 */}
      {isReloading && (
        <div 
          className="map-loading-overlay"
          style={{
            pointerEvents: "none", // ✅ 핵심: 지도 클릭 방해 안함
          }}
        >
          <div className="map-loading-spinner"></div>
        </div>
      )}

      {/* ✅ 모바일 하단 "리스트로 보기" 버튼/박스 제거 (사용자 요청) - 리스트 전환은 검색바 옆 토글로만 가능 */}

      {/* ✅ DetailOverlay 제거 (라우팅 방식으로 변경) */}
      {/* 상세 페이지는 /trade/:id 라우트로 이동 */}
    </div>
  );
}
