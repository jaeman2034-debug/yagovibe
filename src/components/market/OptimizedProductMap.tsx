/**
 * 🔥 안정적인 상품 지도 컴포넌트 (200줄 버전)
 * 
 * 기능:
 * - Google Map
 * - 마커
 * - 클러스터
 * - 상품 클릭
 * - viewport 필터
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Cluster } from "@googlemaps/markerclusterer";
import { loadGoogleMap } from "@/lib/loadGoogleMap";
import { marketMapClusterRenderer } from "@/components/market/marketMapClusterRenderer";
import type { MarketProduct } from "@/types/market";

/** 마커 탭 직후 패딩 setCenter와 충돌 방지 (느린 기기는 클러스터가 더 김) */
const SUPPRESS_PADDING_AFTER_MARKER_MS = 130;
const SUPPRESS_PADDING_AFTER_CLUSTER_MS = 210;
/** 시트 열린 뒤 mapPadding 반영·panTo 이후 살짝 줌 (패딩보다 먼저 줌하면 어색함) */
const MARKER_ZOOM_AFTER_SHEET_PADDING_MS = 160;

/** UI 오버레이(검색바·시트)를 고려한 지도 padding → panTo/setCenter 시 시각적 중앙에 마커 위치 */
export interface MapPadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/** 클러스터에 포함된 마커에서 상품 복원 (중복 id 제거) */
function productsFromClusterMarkers(cluster: Cluster): MarketProduct[] {
  const raw = cluster.markers ?? [];
  const seen = new Set<string>();
  const out: MarketProduct[] = [];
  for (const marker of raw) {
    const m = marker as google.maps.Marker & { __product?: MarketProduct };
    const p = m.__product;
    if (p?.id && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/** 클러스터 bounds가 이미 거의 한 점이면 fitBounds 대신 완만 확대만 */
function clusterBoundsTooTight(b: google.maps.LatLngBounds): boolean {
  const ne = b.getNorthEast();
  const sw = b.getSouthWest();
  const latSpan = Math.abs(ne.lat() - sw.lat());
  const lngSpan = Math.abs(ne.lng() - sw.lng());
  return latSpan < 0.0025 && lngSpan < 0.0025;
}

interface OptimizedProductMapProps {
  products: MarketProduct[];
  center?: { lat: number; lng: number };
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  onProductClick?: (product: MarketProduct) => void;
  height?: string;
  isActive?: boolean;
  onMapReady?: (map: google.maps.Map) => void;
  onMarkerClick?: (product: MarketProduct, mapsLib: typeof google.maps, dongName?: string) => void | Promise<void>;
  onIdle?: (center: { lat: number; lng: number }, bounds: google.maps.LatLngBounds | null) => void;
  selectedProductId?: string | null;
  isReloading?: boolean;
  /** 상단 검색바·하단 시트 등 오버레이 높이. 지정 시 지도 중심이 시각적 중앙이 됨(마커 치우침 방지) */
  mapPadding?: MapPadding;
  /** false면 상품 목록이 바뀔 때마다 fitBounds 하지 않음(지도 앱·뷰포트 조회용) */
  autoFitToProducts?: boolean;
  /** 사용자가 지도를 드래그·줌했을 때 (이 지역 검색 UX 등) */
  onViewportUserAction?: () => void;
  /** 드래그 시작 (CTA 숨김 등) */
  onMapDragStart?: () => void;
  /** 지도 빈 곳 클릭 (마커/클러스터 제외) — 선택 해제·시트 닫기 */
  onMapBackgroundClick?: () => void;
  /** 클러스터 탭으로 fitBounds 직전 — 이 지역 검색 CTA 깜빡임 억제 등 */
  onClusterNavigateStart?: () => void;
  /** 클러스터 탭 시 포함 상품 목록 — 지정 시 줌/fitBounds 대신 부모에서 바텀 시트 등 처리 */
  onClusterProductsClick?: (products: MarketProduct[]) => void;
  /** 패딩 반영 등 코드에서 panTo 직전 — 부모에서 idle 부가 처리 스킵 등 */
  onProgrammaticMapPan?: () => void;
}

export default function OptimizedProductMap({
  products,
  center,
  zoom = 12,
  userLocation,
  onProductClick,
  height = "100%",
  isActive = true,
  onMapReady,
  onMarkerClick,
  onIdle,
  selectedProductId,
  mapPadding,
  autoFitToProducts = true,
  onViewportUserAction,
  onMapDragStart,
  onMapBackgroundClick,
  onClusterNavigateStart,
  onClusterProductsClick,
  onProgrammaticMapPan,
}: OptimizedProductMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onViewportUserActionRef = useRef(onViewportUserAction);
  onViewportUserActionRef.current = onViewportUserAction;
  const onMapDragStartRef = useRef(onMapDragStart);
  onMapDragStartRef.current = onMapDragStart;
  const onMapBackgroundClickRef = useRef(onMapBackgroundClick);
  onMapBackgroundClickRef.current = onMapBackgroundClick;
  const mapPaddingRef = useRef(mapPadding);
  mapPaddingRef.current = mapPadding;
  /** 패딩 적용 직후 setCenter로 panTo와 싸우지 않도록 짧게 재중심 생략 (마커 탭 직후 등) */
  const suppressPaddingRecenterUntilRef = useRef(0);
  const onProductClickRef = useRef(onProductClick);
  onProductClickRef.current = onProductClick;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onClusterNavigateStartRef = useRef(onClusterNavigateStart);
  onClusterNavigateStartRef.current = onClusterNavigateStart;
  const onClusterProductsClickRef = useRef(onClusterProductsClick);
  onClusterProductsClickRef.current = onClusterProductsClick;
  const onProgrammaticMapPanRef = useRef(onProgrammaticMapPan);
  onProgrammaticMapPanRef.current = onProgrammaticMapPan;
  const markerZoomAfterPanTimeoutRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 위치(lat/lng) 있는 상품만 지도 마커 표시 (위치 없는 상품은 리스트에만 표시)
  const validProducts = useMemo(() => {
    return products.filter((p) => {
      const lat = p.latitude != null ? Number(p.latitude) : ((p as any).lat != null ? Number((p as any).lat) : null);
      const lng = p.longitude != null ? Number(p.longitude) : ((p as any).lng != null ? Number((p as any).lng) : null);
      return (
        lat != null &&
        lng != null &&
        !Number.isNaN(lat) &&
        !Number.isNaN(lng) &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });
  }, [products]);

  /** idle/initMap 클로저가 첫 렌더의 빈 배열을 물지 않도록 항상 최신 유효 상품만 참조 */
  const validProductsRef = useRef(validProducts);
  validProductsRef.current = validProducts;

  const selectedProductIdRef = useRef(selectedProductId ?? null);
  selectedProductIdRef.current = selectedProductId ?? null;

  const bindProductMarkerClick = useCallback((marker: google.maps.Marker) => {
    if (!window.google?.maps?.event) return;
    const maps = window.google.maps;
    maps.event.clearListeners(marker, "click");
    marker.addListener("click", () => {
      const product = (marker as { __product?: MarketProduct }).__product;
      if (!product?.id) return;
      const lat = Number(product.latitude ?? (product as any).lat);
      const lng = Number(product.longitude ?? (product as any).lng);
      if (Number.isNaN(lat) || Number.isNaN(lng) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

      onProductClickRef.current?.(product);
      void onMarkerClickRef.current?.(product, maps, undefined);
      // panTo는 mapPadding(시트) 반영 이후 useEffect에서 처리 — 여기서는 줌만 약간 지연
      if (markerZoomAfterPanTimeoutRef.current != null) {
        clearTimeout(markerZoomAfterPanTimeoutRef.current);
        markerZoomAfterPanTimeoutRef.current = null;
      }
      markerZoomAfterPanTimeoutRef.current = window.setTimeout(() => {
        markerZoomAfterPanTimeoutRef.current = null;
        const m = mapInstanceRef.current;
        if (!m) return;
        const z = m.getZoom() ?? 13;
        m.setZoom(Math.min(z + 2, 17));
      }, MARKER_ZOOM_AFTER_SHEET_PADDING_MS);
    });
  }, []);

  // 🔥 뷰포트 기반 필터링 (ref → 지도 init 직후 상품이 늦게 와도 최신 목록 사용)
  const getVisibleProducts = (bounds: google.maps.LatLngBounds | null): MarketProduct[] => {
    const vp = validProductsRef.current;
    if (!bounds) {
      return vp.slice(0, 100);
    }

    return vp.filter((p) => {
      const lat = Number(p.latitude ?? (p as any).lat);
      const lng = Number(p.longitude ?? (p as any).lng);
      return bounds.contains(new window.google.maps.LatLng(lat, lng));
    });
  };

  // 🔥 마커 아이콘 생성
  const createMarkerIcon = (product: MarketProduct, isSelected: boolean = false): google.maps.Icon => {
    // 🔥 안전 체크: window.google.maps가 없으면 기본 아이콘 반환
    if (!window.google?.maps) {
      console.warn("⚠️ [OptimizedProductMap] window.google.maps가 없습니다. 기본 아이콘 사용");
      return {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0 C9 0 0 9 0 20 C0 30 20 50 20 50 C20 50 40 30 40 20 C40 9 31 0 20 0 Z" 
                  fill="#FF6B35" stroke="#fff" stroke-width="2"/>
          </svg>
        `),
      };
    }

    const google = window.google.maps;
    const price = typeof product.price === "number" ? product.price : 0;
    const priceText = price > 0 && price < 100000 
      ? `${(price / 10000).toFixed(0)}만` 
      : price >= 100000 
      ? `${(price / 10000).toFixed(0)}만` 
      : "무료";
    
    const fillColor = isSelected ? "#2563eb" : "#FF6B35";
    const strokeColor = isSelected ? "#1d4ed8" : "#fff";
    /** 선택 시 ~1.45배 — 지도에서 피킹 피드백 강화 */
    const size = isSelected ? 58 : 40;
    
    const svg = `
      <svg width="${size}" height="${size + 10}" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0 C9 0 0 9 0 20 C0 30 20 50 20 50 C20 50 40 30 40 20 C40 9 31 0 20 0 Z" 
              fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isSelected ? 3 : 2}"/>
        <text x="20" y="28" font-family="Arial, sans-serif" font-size="10" font-weight="bold" 
              fill="white" text-anchor="middle">${priceText}</text>
      </svg>
    `;
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.Size(size, size + 10),
      anchor: new google.Point(size / 2, size + 10),
    };
  };

  // 🔥 마커 생성/업데이트 (Map으로 관리하여 재사용)
  const createOrUpdateMarker = (map: google.maps.Map, product: MarketProduct) => {
    if (!window.google?.maps || !product?.id) return;

    const google = window.google.maps;
    const lat = Number(product.latitude ?? (product as any).lat);
    const lng = Number(product.longitude ?? (product as any).lng);
    
    if (Number.isNaN(lat) || Number.isNaN(lng) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const markerId = product.id;
    const position = { lat, lng };
    const isSelected = selectedProductIdRef.current === product.id;

    const existing = markersRef.current.get(markerId);

    const defaultIcon = createMarkerIcon(product, false);
    const activeIcon = createMarkerIcon(product, true);

    if (!existing) {
      const newMarker = new google.Marker({
        position,
        map,
        icon: isSelected ? activeIcon : defaultIcon,
        title: product.name || (product as any).title || "",
        clickable: true,
        optimized: false,
        zIndex: isSelected ? 2500 : 1,
        animation: isSelected ? google.Animation.BOUNCE : undefined,
      });

      (newMarker as any).__product = product;

      bindProductMarkerClick(newMarker);
      console.log("✅ [OptimizedProductMap] marker bound:", product.id, product.name || (product as any).title);

      markersRef.current.set(markerId, newMarker);
      return;
    }

    existing.setPosition(position);
    existing.setMap(map);
    existing.setZIndex(isSelected ? 2500 : 1);
    existing.setIcon(isSelected ? activeIcon : defaultIcon);
    existing.setTitle(product.name || (product as any).title || "");

    if (isSelected) {
      existing.setAnimation(google.Animation.BOUNCE);
      setTimeout(() => {
        existing.setAnimation(null);
      }, 2000);
    } else {
      existing.setAnimation(null);
    }

    (existing as { __product?: MarketProduct }).__product = product;
  };

  // 🔥 마커 생성/업데이트 (뷰포트 기반)
  const createMarkers = (map: google.maps.Map, visibleProducts: MarketProduct[]) => {
    if (!window.google?.maps) {
      console.warn("⚠️ [OptimizedProductMap] window.google.maps가 없습니다. 마커 생성 스킵");
      return;
    }

    console.log("🔍 [OptimizedProductMap] 마커 생성 시작:", {
      visibleProductsCount: visibleProducts.length,
      existingMarkersCount: markersRef.current.size,
    });

    // 기존 마커 중 삭제 대상 제거
    let removedCount = 0;
    markersRef.current.forEach((marker, markerId) => {
      const exists = visibleProducts.some((p) => p.id === markerId);
      if (!exists) {
        try {
          marker.setMap(null);
          markersRef.current.delete(markerId);
          removedCount++;
        } catch (e) {
          // 무시
        }
      }
    });

    // 새 마커 생성 또는 기존 마커 업데이트
    let createdCount = 0;
    let updatedCount = 0;
    visibleProducts.forEach((product) => {
      const existed = markersRef.current.has(product.id);
      createOrUpdateMarker(map, product);
      if (existed) {
        updatedCount++;
      } else {
        createdCount++;
      }
    });

    console.log("✅ [OptimizedProductMap] 마커 생성 완료:", {
      created: createdCount,
      updated: updatedCount,
      removed: removedCount,
      total: markersRef.current.size,
    });

    const markers = Array.from(markersRef.current.values());
    try {
      if (markers.length === 0) {
        clustererRef.current?.clearMarkers();
        return;
      }
      const onClusterClick = (_e: google.maps.MapMouseEvent, cluster: Cluster, m: google.maps.Map) => {
        onClusterNavigateStartRef.current?.();
        suppressPaddingRecenterUntilRef.current = performance.now() + SUPPRESS_PADDING_AFTER_CLUSTER_MS;

        const clusteredProducts = productsFromClusterMarkers(cluster);
        const clusterSheetHandler = onClusterProductsClickRef.current;
        if (clusterSheetHandler && clusteredProducts.length > 0) {
          clusterSheetHandler(clusteredProducts);
          return;
        }

        const currentZoom = m.getZoom() ?? 13;
        if (currentZoom >= 15) {
          m.setZoom(Math.min(currentZoom + 1, 17));
          m.panTo(cluster.position);
          return;
        }

        const pad = mapPaddingRef.current;
        const padding =
          pad && [pad.top, pad.bottom, pad.left, pad.right].some((v) => v != null && v > 0)
            ? {
                top: pad.top ?? 0,
                right: pad.right ?? 0,
                bottom: pad.bottom ?? 0,
                left: pad.left ?? 0,
              }
            : { top: 72, right: 20, bottom: 140, left: 20 };
        const b = cluster.bounds;
        if (b && !clusterBoundsTooTight(b)) {
          try {
            m.fitBounds(b, padding);
          } catch {
            const z = m.getZoom() ?? 14;
            m.setZoom(Math.min(z + 1, 17));
            m.panTo(cluster.position);
          }
        } else {
          const z = m.getZoom() ?? 14;
          m.setZoom(Math.min(z + 1, 17));
          m.panTo(cluster.position);
        }
      };

      if (!clustererRef.current) {
        clustererRef.current = new MarkerClusterer({
          map,
          markers,
          renderer: marketMapClusterRenderer,
          onClusterClick,
        });
      } else {
        clustererRef.current.clearMarkers();
        clustererRef.current.addMarkers(markers);
        clustererRef.current.onClusterClick = onClusterClick;
      }
    } catch (e) {
      console.warn("⚠️ [OptimizedProductMap] MarkerClusterer 동기화 실패:", e);
    }
  };

  // 🔥 지도 초기화 (1회만 실행)
  useEffect(() => {
    if (!isActive) return;
    if (!mapRef.current) return;

    // 🔥 핵심: 이미 Map이 생성된 경우 재생성 금지
    if (mapInstanceRef.current) {
      console.log("✅ [OptimizedProductMap] Map already initialized, skipping");
      return;
    }

    const container = mapRef.current;
    let cancelled = false;

    container.innerHTML = "";
    setLoading(true);
    setError(null);

    loadGoogleMap()
      .then(() => {
        if (cancelled) return;
        if (!mapRef.current) return;

        // 🔥 핵심: 다시 한 번 확인 (비동기 실행 중 생성되었을 수 있음)
        if (mapInstanceRef.current) {
          console.log("✅ [OptimizedProductMap] Map already initialized (after load), skipping");
          setLoading(false);
          return;
        }

        // 🔥 SDK 확인
        if (!window.google?.maps?.Map) {
          throw new Error("Google Maps Map 클래스가 없습니다.");
        }

        if (typeof window.google.maps.Map !== 'function') {
          throw new Error("Google Maps Map이 함수가 아닙니다.");
        }

        const currentContainer = mapRef.current;
        if (!currentContainer || !currentContainer.isConnected) {
          console.warn("⚠️ [OptimizedProductMap] 컨테이너가 준비되지 않았습니다.");
          setLoading(false);
          return;
        }

        // 🔥 컨테이너 크기 확인
        const rect = currentContainer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn("⚠️ [OptimizedProductMap] 컨테이너 크기가 0입니다. 재시도...");
          setTimeout(() => {
            if (cancelled || !mapRef.current) return;
            const retryRect = mapRef.current.getBoundingClientRect();
            if (retryRect.width > 0 && retryRect.height > 0) {
              void initMap();
            }
          }, 200);
          return;
        }

        void initMap();

        async function initMap() {
          if (cancelled || !mapRef.current) return;
          if (mapInstanceRef.current) return; // 🔥 중복 생성 방지

          const mapContainer = mapRef.current;
          if (!mapContainer || !mapContainer.isConnected) return;

          const defaultCenter = center || (userLocation ? userLocation : { lat: 37.5665, lng: 126.9780 });

          try {
            // 🔥 지도 생성 (반드시 window.google.maps.Map 사용)
            const map = new window.google.maps.Map(mapContainer, {
              center: defaultCenter,
              zoom,
              gestureHandling: "greedy",
              draggable: true,
              scrollwheel: true,
              clickableIcons: false,
              keyboardShortcuts: false,
              disableDefaultUI: true,
              zoomControl: true,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
            });

            // 🔥 즉시 ref에 저장 (중복 생성 방지)
            mapInstanceRef.current = map;

            // 🔥 UI 오버레이(검색바·시트) 고려: padding 설정 시 panTo/setCenter가 시각적 중앙 기준으로 동작 → 마커 치우침 방지
            if (mapPadding && [mapPadding.top, mapPadding.bottom, mapPadding.left, mapPadding.right].some((v) => v != null && v > 0)) {
              (map as google.maps.Map & { setOptions(opts: { padding?: { top?: number; bottom?: number; left?: number; right?: number } }): void }).setOptions({
                padding: {
                  top: mapPadding.top ?? 0,
                  bottom: mapPadding.bottom ?? 0,
                  left: mapPadding.left ?? 0,
                  right: mapPadding.right ?? 0,
                },
              });
            }

            // 🔥 반응형/탭 전환 시 canvas 깨짐 방지: 생성 직후 resize 트리거 (필수)
            setTimeout(() => {
              if (window.google?.maps?.event && map) {
                window.google.maps.event.trigger(map, "resize");
                const c = map.getCenter();
                if (c) map.setCenter(c);
              }
            }, 0);

            // 🔥 컨테이너 크기 변경 감지 (반응형/사이드바/탭 전환 시 지도 재렌더)
            if (typeof ResizeObserver !== "undefined" && mapContainer) {
              resizeObserverRef.current = new ResizeObserver(() => {
                if (!window.google?.maps?.event || !map) return;
                window.google.maps.event.trigger(map, "resize");
                const center = map.getCenter();
                if (center) map.setCenter(center);
              });
              resizeObserverRef.current.observe(mapContainer);
            }

            console.log("✅ [OptimizedProductMap] Map 생성 완료:", {
              containerChildren: mapContainer.children.length,
            });

            // 🔥 지도 준비 완료 콜백
            if (onMapReady) {
              onMapReady(map);
            }

            map.addListener("dragstart", () => {
              onMapDragStartRef.current?.();
              onViewportUserActionRef.current?.();
            });
            map.addListener("zoom_changed", () => {
              onViewportUserActionRef.current?.();
            });

            map.addListener("click", () => {
              onMapBackgroundClickRef.current?.();
            });

            // 🔥 idle 이벤트: 마커 생성 및 콜백
            map.addListener("idle", () => {
              if (cancelled || !mapInstanceRef.current) return;

              const idleBounds = mapInstanceRef.current.getBounds() ?? null;
              const visibleProducts = getVisibleProducts(idleBounds);

              createMarkers(mapInstanceRef.current, visibleProducts);
              setLoading(false);

              // 🔥 지도 중심 검색 UX
              if (onIdle && mapInstanceRef.current) {
                const mapCenter = mapInstanceRef.current.getCenter();
                if (mapCenter) {
                  onIdle(
                    { lat: mapCenter.lat(), lng: mapCenter.lng() },
                    idleBounds
                  );
                }
              }
            });

            // 🔥 초기 마커 생성: getBounds()는 생성 직후 null/좁은 영역이라 2개만 나오는 문제 방지 → 전체 유효 상품으로 표시
            const initialBounds = map.getBounds();
            const initialProducts = initialBounds
              ? getVisibleProducts(initialBounds)
              : getVisibleProducts(null);
            const useFullList = initialProducts.length <= 2 && validProductsRef.current.length > 2;
            createMarkers(map, useFullList ? getVisibleProducts(null) : initialProducts);
            setLoading(false);

          } catch (mapError) {
            console.error("❌ [OptimizedProductMap] Map 생성 실패:", mapError);
            setError("지도를 불러올 수 없습니다.");
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error("❌ [OptimizedProductMap] 지도 로드 실패:", err);
        setError("지도를 불러올 수 없습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (markerZoomAfterPanTimeoutRef.current != null) {
        clearTimeout(markerZoomAfterPanTimeoutRef.current);
        markerZoomAfterPanTimeoutRef.current = null;
      }
      if (resizeObserverRef.current && mapRef.current) {
        try {
          resizeObserverRef.current.disconnect();
        } catch (_e) {}
        resizeObserverRef.current = null;
      }
      // 마커 제거
      try {
        clustererRef.current?.clearMarkers();
        clustererRef.current?.setMap(null);
      } catch (_e) {
        /* ignore */
      }
      clustererRef.current = null;

      markersRef.current.forEach((marker) => {
        try {
          marker.setMap(null);
        } catch (e) {
          // 무시
        }
      });
      markersRef.current.clear();

      // Map 인스턴스는 유지 (재생성 방지)
    };
  }, [isActive]); // 🔥 isActive만 의존성 (한 번만 실행)

  // 상품이 지도 init 이후에 도착하면 idle이 다시 안 올 수 있음 → 마커 강제 동기화
  useEffect(() => {
    if (!isActive) return;
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    const idleBounds = map.getBounds() ?? null;
    const initialProducts = idleBounds ? getVisibleProducts(idleBounds) : getVisibleProducts(null);
    const useFullList =
      initialProducts.length <= 2 && validProductsRef.current.length > 2;
    createMarkers(map, useFullList ? getVisibleProducts(null) : initialProducts);
  }, [isActive, validProducts]);

  // 🔥 지도 탭으로 돌아올 때(이미 인스턴스 있음) resize 트리거 → canvas 깨짐 방지
  useEffect(() => {
    if (!isActive || !mapInstanceRef.current || !mapRef.current || !window.google?.maps?.event) return;
    const map = mapInstanceRef.current;
    const timer = setTimeout(() => {
      if (!mapInstanceRef.current) return;
      window.google.maps.event.trigger(map, "resize");
      const c = map.getCenter();
      if (c) map.setCenter(c);
    }, 100);
    return () => clearTimeout(timer);
  }, [isActive]);

  // 🔥 선택된 상품 변경 시 마커 하이라이트 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    markersRef.current.forEach((marker, markerId) => {
      const product = (marker as any).__product as MarketProduct | undefined;
      if (!product) return;

      const isSelected = selectedProductId === markerId;
      const markerIcon = createMarkerIcon(product, isSelected);
      
      marker.setIcon(markerIcon);
      marker.setZIndex(isSelected ? 2500 : 1);
      
      if (isSelected) {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {
          marker.setAnimation(null);
        }, 2000);
      } else {
        marker.setAnimation(null);
      }
    });
  }, [selectedProductId]);

  // 하단 시트 등 오버레이 변경 시 padding 반영 (마커가 가려지지 않도록)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    const pad = mapPadding;
    if (pad && [pad.top, pad.bottom, pad.left, pad.right].some((v) => v != null && v > 0)) {
      (map as google.maps.Map & {
        setOptions(opts: { padding?: { top?: number; bottom?: number; left?: number; right?: number } }): void;
      }).setOptions({
        padding: {
          top: pad.top ?? 0,
          bottom: pad.bottom ?? 0,
          left: pad.left ?? 0,
          right: pad.right ?? 0,
        },
      });
    } else {
      (map as google.maps.Map & {
        setOptions(opts: { padding?: { top?: number; bottom?: number; left?: number; right?: number } }): void;
      }).setOptions({ padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    }

    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled || !mapInstanceRef.current) return;
        const m = mapInstanceRef.current;
        const sel = selectedProductIdRef.current;
        if (sel) {
          const marker = markersRef.current.get(sel);
          const pos = marker?.getPosition?.();
          if (pos) {
            onProgrammaticMapPanRef.current?.();
            m.panTo({ lat: pos.lat(), lng: pos.lng() });
          }
          return;
        }
        if (performance.now() < suppressPaddingRecenterUntilRef.current) return;
        const c = m.getCenter();
        if (c) m.setCenter(c);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [mapPadding, selectedProductId]);

  // 🔥 자동 줌: 상품 위치를 기반으로 지도 bounds 자동 조정
  useEffect(() => {
    if (!autoFitToProducts) return;
    if (!mapInstanceRef.current || !validProducts.length) return;

    const map = mapInstanceRef.current;
    if (!window.google?.maps) return;

    if (validProducts.length === 1) {
      const product = validProducts[0];
      const lat = Number(product.latitude ?? (product as any).lat);
      const lng = Number(product.longitude ?? (product as any).lng);
      
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        map.setCenter({ lat, lng });
        map.setZoom(15);
      }
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidBounds = false;

    validProducts.forEach((product) => {
      const lat = Number(product.latitude ?? (product as any).lat);
      const lng = Number(product.longitude ?? (product as any).lng);
      
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        bounds.extend(new window.google.maps.LatLng(lat, lng));
        hasValidBounds = true;
      }
    });

    if (hasValidBounds) {
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      });
    }
  }, [validProducts, isActive, autoFitToProducts]);

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: height || "100%",
        overflow: "hidden",
      }}
    >
      {/* 🔥 위치 없는 상품만 있을 때 안내 */}
      {products.length > 0 && validProducts.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            padding: "1rem 1.5rem",
            backgroundColor: "rgba(255,255,255,0.95)",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            textAlign: "center",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          위치 정보가 있는 상품이 없습니다.
          <br />
          <span style={{ fontSize: "12px", color: "#6b7280" }}>리스트에서 확인해보세요.</span>
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
          touchAction: "pan-x pan-y",
        }}
      />
    </div>
  );
}
