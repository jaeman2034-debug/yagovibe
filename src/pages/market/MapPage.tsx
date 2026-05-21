/**
 * 중고거래 상품 지도 — 풀스크린 지도 + 플로팅(리스트·필터) + 필터 시트
 *
 * 경로: `/market/map` — URL 쿼리: type, category, sort
 */

import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useUserLocation } from "@/hooks/useUserLocation";
import OptimizedProductMap from "@/components/market/OptimizedProductMap";
import MarketSubHeader, { type MarketServiceType } from "@/components/market/MarketSubHeader";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";
import type { MarketProduct } from "@/types/market";
import { parseMarketProduct } from "@/types/market";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MARKET_CATEGORIES } from "@/data/marketCategories";
import type { MarketSortMode } from "@/types/sort";
import { List, LocateFixed, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { getDistanceKm } from "@/utils/geo";
import { formatDistance } from "@/utils/formatDistance";
import { debounce } from "@/utils/debounce";
import { parseMapBoundsParam, serializeMapBounds } from "@/utils/mapBoundsQuery";
import MarketMapProductSheet from "@/components/market/MarketMapProductSheet";
import MarketMapClusterSheet from "@/components/market/MarketMapClusterSheet";
import { trackMarketMap } from "@/lib/analytics";
import type { MarketLayoutOutletContext } from "@/layouts/MarketLayout";

type SortType = "latest" | "price_low" | "price_high";
type RadiusKm = 1 | 3 | 5;

/** 지도 패딩: 상단 플로팅(리스트·필터) + safe-area */
const MAP_PADDING_TOP = 64;

/** 뷰포트 기반 Firestore 조회용 (위도 슬라이스 + 경도는 클라이언트 필터). 지도 영역은 onSnapshot 없이 getDocs 단발만 사용. */
type MapQueryBounds = { north: number; south: number; east: number; west: number };

function boundsFromGoogleBounds(b: google.maps.LatLngBounds): MapQueryBounds {
  const ne = b.getNorthEast();
  const sw = b.getSouthWest();
  return { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() };
}

function boundsKey(b: MapQueryBounds): string {
  return `${b.north.toFixed(5)},${b.south.toFixed(5)},${b.east.toFixed(5)},${b.west.toFixed(5)}`;
}

/** 동일 뷰로 간주해 재조회 스킵 (미세 idle 플리커·중복 탭 방지) */
function boundsNearlyEqual(a: MapQueryBounds, b: MapQueryBounds): boolean {
  return boundsKey(a) === boundsKey(b);
}

function lngInBounds(lng: number, west: number, east: number): boolean {
  if (west <= east) return lng >= west && lng <= east;
  return lng >= west || lng <= east;
}

function boundsCenterKmApart(a: MapQueryBounds, b: MapQueryBounds): number {
  const ca = { lat: (a.north + a.south) / 2, lng: (a.east + a.west) / 2 };
  const cb = { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
  return getDistanceKm(ca, cb);
}

/** map_move 과다 전송 방지 (idle이 자주 올 수 있음) */
const MAP_MOVE_LOG_MIN_MS = 6000;

const LAT_QUERY_LIMIT = 280;
const FALLBACK_RECENT_LIMIT = 220;

/** 빈 상태 시 탐색 유도용 (서울 시청 근처) */
const SEOUL_EXPLORE_CENTER = { lat: 37.5665, lng: 126.978 };

function productLatLng(p: MarketProduct): { lat: number; lng: number } | null {
  const latRaw = p.latitude ?? (p as { lat?: unknown }).lat;
  const lngRaw = p.longitude ?? (p as { lng?: unknown }).lng;
  const lat = typeof latRaw === "string" ? Number(latRaw.replace(/[^\d.-]/g, "")) : Number(latRaw);
  const lng = typeof lngRaw === "string" ? Number(lngRaw.replace(/[^\d.-]/g, "")) : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function productInMapBounds(p: MarketProduct, b: MapQueryBounds): boolean {
  const pos = productLatLng(p);
  if (!pos) return false;
  if (pos.lat < b.south || pos.lat > b.north) return false;
  return lngInBounds(pos.lng, b.west, b.east);
}

function productThumbnail(p: MarketProduct): string {
  const allImages = [...(p.images || []), ...(p.gallery || [])];
  if (allImages.length > 0 && typeof allImages[0] === "string") return allImages[0];
  if (typeof p.imageUrl === "string" && p.imageUrl.length > 0) return p.imageUrl;
  return "/placeholder-image.png";
}

const overlayCard =
  "rounded-2xl border border-gray-200/90 bg-white/95 shadow-lg backdrop-blur-md dark:border-gray-600/90 dark:bg-gray-900/92";

export default function MapPage() {
  const navigate = useNavigate();
  const marketLayoutContext = useOutletContext<MarketLayoutOutletContext | null>();
  const setMapOverlayActive = marketLayoutContext?.setMapOverlayActive ?? (() => {});
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { loc: userLoc } = useUserLocation();

  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionRefreshing, setRegionRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [queryBounds, setQueryBounds] = useState<MapQueryBounds | null>(null);
  const [liveBounds, setLiveBounds] = useState<MapQueryBounds | null>(null);
  const [appliedSearchBounds, setAppliedSearchBounds] = useState<MapQueryBounds | null>(null);
  const liveBoundsRef = useRef<MapQueryBounds | null>(null);
  const mapMoveThrottleRef = useRef<{ key: string; at: number } | null>(null);
  const prevFilteredCountForEmptyLog = useRef<number | null>(null);
  const radiusEmptyOverlayLoggedRef = useRef(false);
  const fetchErrorLoggedRef = useRef(false);
  const [regionSearchCtaVisible, setRegionSearchCtaVisible] = useState(false);
  const [lastRegionFetchCount, setLastRegionFetchCount] = useState(0);
  const [mapDragging, setMapDragging] = useState(false);
  const mapFetchGenerationRef = useRef(0);
  /** 패딩·마커 선택으로 인한 panTo → idle 연쇄에서 불필요한 map_move 등 억제 */
  const programmaticMapIdleRef = useRef(false);

  const [serviceType, setServiceType] = useState<MarketServiceType>("market");
  const [sortMode, setSortMode] = useState<MarketSortMode>("latest");
  const [sortType, setSortType] = useState<SortType>("latest");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [sheetProduct, setSheetProduct] = useState<MarketProduct | null>(null);
  const [clusterSheetProducts, setClusterSheetProducts] = useState<MarketProduct[] | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<"peek" | "tall">("peek");
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 640
  );
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const silentRefreshRef = useRef(false);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setSheetSnap("peek");
  }, [sheetProduct?.id]);

  /** 하단 시트·필터 시트 열림 시 MarketLayout에서 GlobalFAB 숨김 (터치 겹침 방지) */
  useEffect(() => {
    const active =
      sheetProduct != null || filterSheetOpen || (clusterSheetProducts != null && clusterSheetProducts.length > 0);
    setMapOverlayActive(active);
    return () => setMapOverlayActive(false);
  }, [sheetProduct, filterSheetOpen, clusterSheetProducts, setMapOverlayActive]);
  const prevSignatureRef = useRef<string>("");
  const didInitialPanRef = useRef(false);
  /** 리스트·URL에서 돌아올 때 동일 bounds fitBounds 중복 방지 */
  const lastAppliedUrlBoundsKeyRef = useRef<string | null>(null);

  const parsedUrlBounds = useMemo(
    () => parseMapBoundsParam(searchParams.get("bounds")),
    [searchParams]
  );
  const parsedUrlBoundsRef = useRef(parsedUrlBounds);
  parsedUrlBoundsRef.current = parsedUrlBounds;

  useEffect(() => {
    if (!queryBounds) return;

    const signature = `${searchParams.toString()}|${refreshTick}|${boundsKey(queryBounds)}`;
    if (prevSignatureRef.current === signature) return;
    prevSignatureRef.current = signature;

    const sortParam = searchParams.get("sort");
    const categoryParam = searchParams.get("category");
    const typeParam = searchParams.get("type");

    const newSortType: SortType =
      sortParam === "latest" || sortParam === "price_low" || sortParam === "price_high"
        ? sortParam
        : "latest";

    const newSelectedCategory =
      typeof categoryParam === "string" && categoryParam !== "all"
        ? decodeURIComponent(categoryParam)
        : null;

    let newServiceType: MarketServiceType = "market";
    if (typeParam === "sell") {
      newServiceType = "market";
    } else if (typeParam === "share") {
      newServiceType = "free";
    } else if (typeParam === "lost") {
      newServiceType = "lost";
    }

    setSortType(newSortType);
    setSelectedCategory(newSelectedCategory);
    setServiceType(newServiceType);

    const silent = silentRefreshRef.current;
    silentRefreshRef.current = false;

    const boundsSnapshot: MapQueryBounds = { ...queryBounds };
    const { south, north, west, east } = boundsSnapshot;

    const loadProducts = async () => {
      const loadGeneration = ++mapFetchGenerationRef.current;
      try {
        if (silent) {
          setRegionRefreshing(true);
        } else {
          setFetchLoading(true);
        }
        setError(null);

        let q;
        if (newServiceType === "free") {
          q = query(
            collection(db, "marketProducts"),
            where("serviceType", "==", "free"),
            where("latitude", ">=", south),
            where("latitude", "<=", north),
            orderBy("latitude"),
            limit(LAT_QUERY_LIMIT)
          );
        } else if (newServiceType === "lost") {
          q = query(
            collection(db, "marketProducts"),
            where("serviceType", "==", "lost"),
            where("latitude", ">=", south),
            where("latitude", "<=", north),
            orderBy("latitude"),
            limit(LAT_QUERY_LIMIT)
          );
        } else {
          q = query(
            collection(db, "marketProducts"),
            where("latitude", ">=", south),
            where("latitude", "<=", north),
            orderBy("latitude"),
            limit(LAT_QUERY_LIMIT)
          );
        }

        const snap = await getDocs(q);
        if (loadGeneration !== mapFetchGenerationRef.current) return;

        let loadedProducts = snap.docs.map((docSnap) => parseMarketProduct(docSnap));

        const afterLatSlice = loadedProducts.length;
        loadedProducts = loadedProducts.filter((p) => {
          const pos = productLatLng(p);
          if (!pos) return false;
          return lngInBounds(pos.lng, west, east);
        });
        const afterLngFilter = loadedProducts.length;

        if (import.meta.env.DEV) {
          console.debug("[MapPage] bounds", { south, north, west, east });
          console.debug("[MapPage] fetch", {
            rawDocs: snap.size,
            afterLatSlice,
            afterLngFilter,
            serviceType: newServiceType,
          });
          if (snap.size > 0 && loadedProducts.length === 0) {
            const sample = snap.docs.slice(0, 3).map((d) => parseMarketProduct(d));
            console.debug(
              "[MapPage] lng 필터로 0건 — 샘플",
              sample.map((x) => ({ id: x.id, ll: productLatLng(x) }))
            );
          }
        }

        /** latitude 필드만 없고 lat/location 만 있는 문서는 위도 슬라이스 쿼리에서 빠짐 → 최근 N건으로 보강 */
        if (loadedProducts.length === 0) {
          if (loadGeneration !== mapFetchGenerationRef.current) return;
          let fbQ;
          if (newServiceType === "free") {
            fbQ = query(
              collection(db, "marketProducts"),
              where("serviceType", "==", "free"),
              orderBy("createdAt", "desc"),
              limit(FALLBACK_RECENT_LIMIT)
            );
          } else if (newServiceType === "lost") {
            fbQ = query(
              collection(db, "marketProducts"),
              where("serviceType", "==", "lost"),
              orderBy("createdAt", "desc"),
              limit(FALLBACK_RECENT_LIMIT)
            );
          } else {
            fbQ = query(collection(db, "marketProducts"), orderBy("createdAt", "desc"), limit(FALLBACK_RECENT_LIMIT));
          }
          const fbSnap = await getDocs(fbQ);
          if (loadGeneration !== mapFetchGenerationRef.current) return;

          loadedProducts = fbSnap.docs
            .map((docSnap) => parseMarketProduct(docSnap))
            .filter((p) => productInMapBounds(p, boundsSnapshot));

          if (import.meta.env.DEV) {
            console.debug("[MapPage] fallback bounds-filter", {
              fbDocs: fbSnap.size,
              inBounds: loadedProducts.length,
            });
          }
        }

        if (newServiceType !== "free" && newServiceType !== "lost") {
          loadedProducts = loadedProducts.filter((p) => {
            const productServiceType = (p as { serviceType?: string }).serviceType;
            return productServiceType === "market" || productServiceType === "sell" || !productServiceType;
          });
        }

        if (newSelectedCategory) {
          loadedProducts = loadedProducts.filter((p) => p.category === newSelectedCategory);
        }

        if (newSortType === "price_low") {
          loadedProducts.sort((a, b) => {
            const priceA = typeof a.price === "number" ? a.price : 0;
            const priceB = typeof b.price === "number" ? b.price : 0;
            return priceA - priceB;
          });
        } else if (newSortType === "price_high") {
          loadedProducts.sort((a, b) => {
            const priceA = typeof a.price === "number" ? a.price : 0;
            const priceB = typeof b.price === "number" ? b.price : 0;
            return priceB - priceA;
          });
        } else {
          loadedProducts.sort((a, b) => {
            let aTime = 0;
            let bTime = 0;
            if (a.createdAt) {
              if (a.createdAt?.toDate && typeof a.createdAt.toDate === "function") {
                aTime = a.createdAt.toDate().getTime();
              } else if (typeof a.createdAt === "string") {
                aTime = new Date(a.createdAt).getTime();
              } else if (a.createdAt instanceof Date) {
                aTime = a.createdAt.getTime();
              }
            }
            if (b.createdAt) {
              if (b.createdAt?.toDate && typeof b.createdAt.toDate === "function") {
                bTime = b.createdAt.toDate().getTime();
              } else if (typeof b.createdAt === "string") {
                bTime = new Date(b.createdAt).getTime();
              } else if (b.createdAt instanceof Date) {
                bTime = b.createdAt.getTime();
              }
            }
            return bTime - aTime;
          });
        }

        if (loadGeneration !== mapFetchGenerationRef.current) return;

        setProducts(loadedProducts);
        setLastRegionFetchCount(loadedProducts.length);
        setAppliedSearchBounds(boundsSnapshot);
        void trackMarketMap.mapResultCount({
          count: loadedProducts.length,
          service_type: newServiceType,
          bounds_key: boundsKey(boundsSnapshot),
        });
      } catch (err: unknown) {
        if (loadGeneration !== mapFetchGenerationRef.current) return;
        const e = err as { code?: string; message?: string };
        if (e.code === "failed-precondition" || e.message?.includes("index")) {
          const errorMessage = e.message || "인덱스가 필요합니다.";
          const indexUrl = errorMessage.match(/https:\/\/[^\s]+/)?.[0];
          setError(
            indexUrl
              ? `Firebase 인덱스가 필요합니다. 관리자에게 문의하세요. (링크: ${indexUrl})`
              : "Firebase 인덱스가 필요합니다. 관리자에게 문의하세요."
          );
        } else {
          setError("상품을 불러올 수 없습니다.");
        }
      } finally {
        if (loadGeneration !== mapFetchGenerationRef.current) return;
        if (silent) {
          setRegionRefreshing(false);
        } else {
          setFetchLoading(false);
        }
      }
    };

    void loadProducts();
  }, [searchParams, refreshTick, queryBounds]);

  const handleServiceTypeChange = useCallback(
    (type: MarketServiceType) => {
      setServiceType(type);
      const newParams = new URLSearchParams(searchParams);
      if (type === "market") {
        newParams.set("type", "sell");
      } else if (type === "free") {
        newParams.set("type", "share");
      } else if (type === "lost") {
        newParams.set("type", "lost");
      } else {
        newParams.delete("type");
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const changeSort = useCallback(
    (next: SortType) => {
      setSortType(next);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("sort", next);
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const changeCategory = useCallback(
    (next: string | null) => {
      setSelectedCategory(next);
      const newParams = new URLSearchParams(searchParams);
      if (next && next !== "all") {
        newParams.set("category", next);
      } else {
        newParams.delete("category");
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleRefreshRegion = useCallback(
    (force = false) => {
      const b = liveBoundsRef.current;
      if (!force && b && appliedSearchBounds && boundsNearlyEqual(b, appliedSearchBounds)) {
        return;
      }
      if (b) setQueryBounds({ ...b });
      silentRefreshRef.current = true;
      prevSignatureRef.current = "";
      setRefreshTick((t) => t + 1);
    },
    [appliedSearchBounds]
  );

  const handleProgrammaticMapPan = useCallback(() => {
    programmaticMapIdleRef.current = true;
  }, []);

  const handleMapIdle = useCallback(
    (_center: { lat: number; lng: number }, bounds: google.maps.LatLngBounds | null) => {
      setMapDragging(false);
      if (!bounds) return;
      const literal = boundsFromGoogleBounds(bounds);
      const fromProgrammaticPan = programmaticMapIdleRef.current;
      programmaticMapIdleRef.current = false;

      liveBoundsRef.current = literal;
      setLiveBounds(literal);
      setQueryBounds((prev) => prev ?? literal);

      if (fromProgrammaticPan) {
        return;
      }

      const map = mapInstanceRef.current;
      const zRaw = map?.getZoom?.();
      const z = typeof zRaw === "number" && Number.isFinite(zRaw) ? zRaw : -1;
      const bk = boundsKey(literal);
      const now = Date.now();
      const t = mapMoveThrottleRef.current;
      if (!t || t.key !== bk || now - t.at >= MAP_MOVE_LOG_MIN_MS) {
        mapMoveThrottleRef.current = { key: bk, at: now };
        void trackMarketMap.mapMove({
          bounds_key: bk,
          bounds_north: literal.north,
          bounds_south: literal.south,
          bounds_east: literal.east,
          bounds_west: literal.west,
          zoom: z,
        });
      }
    },
    []
  );

  const handleMapDragStart = useCallback(() => {
    setMapDragging(true);
  }, []);

  const handleExploreSeoul = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.panTo(SEOUL_EXPLORE_CENTER);
      map.setZoom(12);
    }
    window.setTimeout(() => {
      handleRefreshRegion(true);
    }, 800);
  }, [handleRefreshRegion]);

  const rawNeedsRegionSearch = useMemo(() => {
    if (!liveBounds || !appliedSearchBounds) return false;
    return boundsCenterKmApart(liveBounds, appliedSearchBounds) > 0.25;
  }, [liveBounds, appliedSearchBounds]);

  const rawNeedsRegionSearchRef = useRef(rawNeedsRegionSearch);
  rawNeedsRegionSearchRef.current = rawNeedsRegionSearch;
  const clusterSuppressCtaUntilRef = useRef(0);

  const debouncedSetRegionCta = useMemo(
    () =>
      debounce((show: boolean) => {
        if (!show) {
          setRegionSearchCtaVisible(false);
          return;
        }
        const revealAfterMapSettle = () => {
          window.setTimeout(() => {
            if (rawNeedsRegionSearchRef.current) setRegionSearchCtaVisible(true);
          }, 120);
        };
        if (performance.now() < clusterSuppressCtaUntilRef.current) {
          const wait = Math.max(50, Math.ceil(clusterSuppressCtaUntilRef.current - performance.now()));
          window.setTimeout(() => {
            revealAfterMapSettle();
          }, wait);
          return;
        }
        revealAfterMapSettle();
      }, 380),
    []
  );

  const handleClusterNavigateStart = useCallback(() => {
    clusterSuppressCtaUntilRef.current = performance.now() + 780;
    debouncedSetRegionCta.cancel();
    setRegionSearchCtaVisible(false);
  }, [debouncedSetRegionCta]);

  useEffect(() => {
    if (rawNeedsRegionSearch) {
      debouncedSetRegionCta(true);
    } else {
      debouncedSetRegionCta.cancel();
      setRegionSearchCtaVisible(false);
    }
    return () => {
      debouncedSetRegionCta.cancel();
    };
  }, [rawNeedsRegionSearch, debouncedSetRegionCta]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const lat = p.latitude != null ? Number(p.latitude) : null;
      const lng = p.longitude != null ? Number(p.longitude) : null;
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

  /** 현재 화면 bounds 안(이미 받아온 목록 기준) — CTA 보조 문구용 */
  const loadedCountInLiveView = useMemo(() => {
    if (!liveBounds) return 0;
    return filteredProducts.filter((p) => productInMapBounds(p, liveBounds)).length;
  }, [filteredProducts, liveBounds]);

  const mapProducts = useMemo(() => {
    if (!userLoc || radiusKm == null) return filteredProducts;
    return filteredProducts.filter((p) => {
      const pos = productLatLng(p);
      if (!pos) return false;
      return getDistanceKm(userLoc, pos) <= radiusKm;
    });
  }, [filteredProducts, userLoc, radiusKm]);

  useEffect(() => {
    if (!error) {
      fetchErrorLoggedRef.current = false;
      return;
    }
    if (fetchErrorLoggedRef.current) return;
    fetchErrorLoggedRef.current = true;
    void trackMarketMap.emptyStateExposed({ variant: "fetch_error", service_type: serviceType });
  }, [error, serviceType]);

  useEffect(() => {
    if (fetchLoading) return;
    const n = filteredProducts.length;
    const prev = prevFilteredCountForEmptyLog.current;
    if (n > 0) {
      prevFilteredCountForEmptyLog.current = n;
      return;
    }
    if (prev !== null && prev > 0) {
      void trackMarketMap.emptyStateExposed({ variant: "no_data_in_view", service_type: serviceType });
    } else if (prev === null) {
      void trackMarketMap.emptyStateExposed({ variant: "no_data_in_view", service_type: serviceType });
    }
    prevFilteredCountForEmptyLog.current = n;
  }, [fetchLoading, filteredProducts.length, serviceType]);

  useEffect(() => {
    if (mapProducts.length === 0 && filteredProducts.length > 0) {
      if (!radiusEmptyOverlayLoggedRef.current) {
        radiusEmptyOverlayLoggedRef.current = true;
        void trackMarketMap.emptyStateExposed({ variant: "radius_filter", service_type: serviceType });
      }
    } else {
      radiusEmptyOverlayLoggedRef.current = false;
    }
  }, [mapProducts.length, filteredProducts.length, serviceType]);

  const applyUrlBoundsToMap = useCallback((map: google.maps.Map, b: MapQueryBounds) => {
    if (!window.google?.maps?.LatLngBounds) return;
    const g = window.google.maps;
    const latLngBounds = new g.LatLngBounds(
      new g.LatLng(b.south, b.west),
      new g.LatLng(b.north, b.east)
    );
    map.fitBounds(latLngBounds, {
      top: MAP_PADDING_TOP + 12,
      bottom: 96,
      left: 20,
      right: 20,
    });
    liveBoundsRef.current = b;
    setLiveBounds(b);
    setQueryBounds(b);
    setAppliedSearchBounds(b);
    prevSignatureRef.current = "";
  }, []);

  const boundsQs = searchParams.get("bounds") ?? "";
  useEffect(() => {
    if (!boundsQs) {
      lastAppliedUrlBoundsKeyRef.current = null;
      return;
    }
    const map = mapInstanceRef.current;
    const b = parseMapBoundsParam(boundsQs);
    if (!map || !b) return;
    const key = boundsKey(b);
    if (lastAppliedUrlBoundsKeyRef.current === key) return;
    lastAppliedUrlBoundsKeyRef.current = key;
    didInitialPanRef.current = true;
    applyUrlBoundsToMap(map, b);
  }, [boundsQs, applyUrlBoundsToMap]);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapInstanceRef.current = map;
      const urlB = parsedUrlBoundsRef.current;
      if (urlB && window.google?.maps?.LatLngBounds) {
        const key = boundsKey(urlB);
        if (lastAppliedUrlBoundsKeyRef.current !== key) {
          lastAppliedUrlBoundsKeyRef.current = key;
          didInitialPanRef.current = true;
          applyUrlBoundsToMap(map, urlB);
        }
        return;
      }
      if (!didInitialPanRef.current && userLoc) {
        didInitialPanRef.current = true;
        map.panTo(userLoc);
        const z = map.getZoom();
        if (z != null && z < 13) map.setZoom(13);
      }
    },
    [userLoc, applyUrlBoundsToMap]
  );

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLoc || didInitialPanRef.current) return;
    didInitialPanRef.current = true;
    map.panTo(userLoc);
    const z = map.getZoom();
    if (z != null && z < 13) map.setZoom(13);
  }, [userLoc]);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    const applyPosition = (pos: GeolocationPosition) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const map = mapInstanceRef.current;
      if (map) {
        map.panTo(loc);
        const z = map.getZoom();
        if (z != null && z < 14) map.setZoom(14);
      }
    };

    const tryGet = (highAccuracy: boolean) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 10_000 : 8_000,
          maximumAge: highAccuracy ? 0 : 120_000,
        });
      });

    void (async () => {
      try {
        applyPosition(await tryGet(true));
      } catch {
        try {
          applyPosition(await tryGet(false));
        } catch {
          // 위치 미허용·타임아웃 — 조용히 무시 (필요 시 토스트로 확장)
        }
      }
    })();
  }, []);

  const handleProductMarkerClick = useCallback((product: MarketProduct) => {
    const pos = productLatLng(product);
    void trackMarketMap.markerClick({
      product_id: product.id,
      lat: pos?.lat,
      lng: pos?.lng,
    });
    setFilterSheetOpen(false);
    setClusterSheetProducts(null);
    setSheetProduct(product);
  }, []);

  const handleClusterProductsClick = useCallback((items: MarketProduct[]) => {
    if (!items.length) return;
    void trackMarketMap.clusterSheetOpen({ count: items.length });
    setFilterSheetOpen(false);
    setSheetProduct(null);
    setClusterSheetProducts(items);
  }, []);

  const handleOpenDetail = useCallback(
    (product: MarketProduct, source: "map_sheet" | "map_cluster_sheet" = "map_sheet") => {
      void trackMarketMap.productClick({ product_id: product.id, source });
      try {
        sessionStorage.setItem("map_viewMode", "map");
      } catch {
        /* ignore */
      }
      navigate(
        sportMarketDetailUrl(
          (product as MarketProduct & { sport?: string }).sport || resolveLastSportId(),
          product.id
        )
      );
    },
    [navigate]
  );

  const handleSwitchToList = useCallback(() => {
    void trackMarketMap.switchToList({
      has_bounds: liveBoundsRef.current != null,
      service_type: serviceType,
    });
    startTransition(() => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("view", "list");
      const lb = liveBoundsRef.current;
      if (lb) {
        newParams.set("bounds", serializeMapBounds(lb));
      } else {
        newParams.delete("bounds");
      }
      navigate(`/app/market?${newParams.toString()}`);
    });
  }, [searchParams, navigate, serviceType]);

  const sheetDistanceKm = useMemo(() => {
    if (!sheetProduct || !userLoc) return null;
    const pos = productLatLng(sheetProduct);
    if (!pos) return null;
    return getDistanceKm(userLoc, pos);
  }, [sheetProduct, userLoc]);

  /** 시트 maxHeight(38vh/72vh) + 하단 네비(4rem)에 맞춰 마커가 시트에 가리지 않도록 */
  const mapPadding = useMemo(() => {
    const bottomNav = 72;
    /** 핸들·vh 반올림 + 마커–시트 사이 “숨통” (패딩이 곧 지도 가시 영역 기준) */
    const sheetVisualBuffer = 56;
    const markerAirGap = 64;
    let bottom = 32;
    if (clusterSheetProducts != null && clusterSheetProducts.length > 0) {
      const clusterPeekPx =
        Math.round(viewportHeight * 0.45) + bottomNav + sheetVisualBuffer + markerAirGap;
      bottom = Math.max(bottom, clusterPeekPx);
    }
    if (sheetProduct) {
      const peekPx = Math.round(viewportHeight * 0.38) + bottomNav + sheetVisualBuffer + markerAirGap;
      const tallPx = Math.round(viewportHeight * 0.72) + bottomNav + sheetVisualBuffer + markerAirGap;
      bottom = sheetSnap === "peek" ? peekPx : tallPx;
    }
    return {
      top: MAP_PADDING_TOP,
      bottom,
      left: 16,
      right: 16,
    };
  }, [sheetProduct, sheetSnap, clusterSheetProducts, viewportHeight]);

  const fabOffset =
    sheetProduct || (clusterSheetProducts != null && clusterSheetProducts.length > 0)
      ? "min(calc(4rem + 36vh), calc(100dvh - 11rem))"
      : "calc(4.25rem + env(safe-area-inset-bottom, 0px))";

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {/* 풀블리드 지도 레이어 */}
      <div className="absolute inset-0 z-0">
        {error ? (
          <div className="flex h-full w-full items-center justify-center bg-red-50/90 px-4 dark:bg-red-950/20">
            <div className="text-center">
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={handleSwitchToList}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                리스트로 보기
              </button>
            </div>
          </div>
        ) : (
          <>
            <OptimizedProductMap
              products={mapProducts}
              center={userLoc || undefined}
              zoom={userLoc ? 13 : 11}
              userLocation={userLoc}
              onProductClick={handleProductMarkerClick}
              onMapReady={handleMapReady}
              onIdle={handleMapIdle}
              onMapDragStart={handleMapDragStart}
              onClusterNavigateStart={handleClusterNavigateStart}
              onClusterProductsClick={handleClusterProductsClick}
              onProgrammaticMapPan={handleProgrammaticMapPan}
              onMapBackgroundClick={() => {
                setSheetProduct(null);
                setClusterSheetProducts(null);
                setFilterSheetOpen(false);
              }}
              selectedProductId={sheetProduct?.id ?? null}
              height="100%"
              mapPadding={mapPadding}
              autoFitToProducts={false}
            />
            {fetchLoading && (
              <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-white/40 dark:bg-black/30">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-sm text-gray-700 shadow-md dark:border-gray-600 dark:bg-gray-900/95 dark:text-gray-200">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  불러오는 중…
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!error && (
        <>
          {/* 상단 플로팅: 리스트 · 필터 (지도 몰입 유지) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-between gap-2 px-2 pt-[max(0.35rem,env(safe-area-inset-top,0px))]">
            <button
              type="button"
              onClick={handleSwitchToList}
              className={`pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-gray-200/90 bg-white/95 px-3 text-xs font-medium text-gray-800 shadow-md backdrop-blur-md dark:border-gray-600/90 dark:bg-gray-900/92 dark:text-gray-100`}
              aria-label="리스트로 보기"
            >
              <List className="h-4 w-4 shrink-0" />
              리스트
            </button>
            <button
              type="button"
              onClick={() => {
                setSheetProduct(null);
                setClusterSheetProducts(null);
                setFilterSheetOpen((o) => !o);
              }}
              className={`pointer-events-auto relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200/90 bg-white/95 shadow-md backdrop-blur-md dark:border-gray-600/90 dark:bg-gray-900/92 ${
                selectedCategory != null || radiusKm != null ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-100"
              }`}
              aria-expanded={filterSheetOpen}
              aria-label={filterSheetOpen ? "필터 닫기" : "필터·정렬"}
              title="필터·정렬"
            >
              <SlidersHorizontal className="h-5 w-5" />
              {(selectedCategory != null || radiusKm != null) && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {filterSheetOpen && (
              <>
                <motion.button
                  type="button"
                  key="filter-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[48] bg-black/40"
                  style={{ bottom: "4rem" }}
                  aria-label="필터 닫기"
                  onClick={() => setFilterSheetOpen(false)}
                />
                <motion.div
                  key="filter-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="map-filter-sheet-title"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  className="fixed right-0 left-0 z-[49] flex max-h-[min(85dvh,640px)] min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.18)] dark:border-gray-700 dark:bg-gray-900"
                  style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
                    <h2 id="map-filter-sheet-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      필터·정렬
                    </h2>
                    <button
                      type="button"
                      onClick={() => setFilterSheetOpen(false)}
                      className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="닫기"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
                    <div className={`${overlayCard} mt-2 overflow-hidden`}>
                      <MarketSubHeader
                        variant="mapOverlay"
                        serviceType={serviceType}
                        onServiceTypeChange={handleServiceTypeChange}
                        sortMode={sortMode}
                        onSortModeChange={(mode) => {
                          setSortMode(mode as MarketSortMode);
                        }}
                        sortType={sortType}
                        onSortTypeChange={changeSort}
                        user={user}
                        userLoc={userLoc}
                        leadingSummary={selectedCategory ?? undefined}
                      />
                    </div>
                    <div className={`${overlayCard} mt-2`}>
                      <div className="border-b border-gray-100 px-2.5 py-2 dark:border-gray-700/80">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          내 근처
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(
                            [
                              { km: null as number | null, label: "전체" },
                              { km: 1 as RadiusKm, label: "1km" },
                              { km: 3 as RadiusKm, label: "3km" },
                              { km: 5 as RadiusKm, label: "5km" },
                            ] as const
                          ).map(({ km, label }) => {
                            const active = radiusKm === km;
                            const disabled = km != null && !userLoc;
                            return (
                              <button
                                key={label}
                                type="button"
                                disabled={disabled}
                                title={disabled ? "위치 권한을 허용하면 사용할 수 있어요" : undefined}
                                onClick={() => setRadiusKm(km)}
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                  active
                                    ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="px-2 py-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          카테고리
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => changeCategory(null)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                              !selectedCategory
                                ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                                : "border-slate-200 text-slate-600 dark:border-gray-600 dark:text-gray-300"
                            }`}
                          >
                            전체
                          </button>
                          {MARKET_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => changeCategory(cat.id)}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                selectedCategory === cat.id
                                  ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                                  : "border-slate-200 text-slate-600 dark:border-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* 우측 플로팅: 이 지역 재검색 · 내 위치 */}
          <AnimatePresence>
            {regionSearchCtaVisible && !mapDragging && (
              <motion.div
                key="region-search-cta"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="pointer-events-none absolute inset-x-0 z-[38] flex justify-center px-4"
                style={{ bottom: `calc(${fabOffset} + 3.25rem)` }}
              >
                <button
                  type="button"
                  onClick={() => {
                    void trackMarketMap.mapSearchClick({
                      source: "region_cta",
                      loaded_preview: loadedCountInLiveView,
                      last_fetch_count: lastRegionFetchCount,
                    });
                    handleRefreshRegion(false);
                  }}
                  disabled={fetchLoading || regionRefreshing}
                  aria-busy={fetchLoading || regionRefreshing}
                  className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-55 disabled:active:scale-100 dark:bg-gray-100 dark:text-gray-900"
                >
                  <span>
                    {loadedCountInLiveView > 0
                      ? `이 지역에서 ${loadedCountInLiveView}개 보기`
                      : "이 지역에서 상품 찾기"}
                  </span>
                  <span className="text-[11px] font-normal opacity-90">
                    직전 조회 {lastRegionFetchCount}개
                    {loadedCountInLiveView > 0 ? " · 탭하면 최신 반영" : ""}
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="pointer-events-none absolute right-2 z-30 flex flex-col gap-4"
            style={{ bottom: fabOffset }}
          >
            <button
              type="button"
              onClick={() => {
                void trackMarketMap.mapSearchClick({
                  source: "fab_refresh",
                  last_fetch_count: lastRegionFetchCount,
                });
                handleRefreshRegion(true);
              }}
              disabled={regionRefreshing || fetchLoading}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              title="이 지역 다시 검색"
              aria-label="이 지역 다시 검색"
            >
              <RefreshCw className={`h-5 w-5 ${regionRefreshing || fetchLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleMyLocation}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-blue-600 shadow-md transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
              aria-label="내 위치로 이동"
            >
              <LocateFixed className="h-5 w-5" />
            </button>
          </div>

          {mapProducts.length === 0 && filteredProducts.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center px-4">
              <div className={`pointer-events-auto max-w-sm ${overlayCard} p-4 text-center`}>
                <p className="text-sm text-gray-800 dark:text-gray-100">선택한 반경 안에 상품이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => setRadiusKm(null)}
                  className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  전체 보기
                </button>
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center px-4">
              <div className={`pointer-events-auto max-w-sm ${overlayCard} p-4 text-center`}>
                <div className="mb-2 text-3xl">📍</div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  이 지역·조건에 맞는 상품이 아직 없어요
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  지도를 옮긴 뒤 「이 지역에서 … 보기」를 눌러 보거나, 반경·카테고리를 바꿔 보세요.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={handleExploreSeoul}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    서울로 이동
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToList}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    리스트로 보기
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {sheetProduct && (
        <MarketMapProductSheet
          product={sheetProduct}
          thumbnailSrc={productThumbnail(sheetProduct)}
          userLocation={userLoc}
          distanceLabel={
            sheetDistanceKm != null ? `내 위치 기준 ${formatDistance(sheetDistanceKm)}` : null
          }
          onClose={() => setSheetProduct(null)}
          onSnapChange={setSheetSnap}
          onOpenDetail={() => {
            const p = sheetProduct;
            setSheetProduct(null);
            handleOpenDetail(p, "map_sheet");
          }}
        />
      )}

      {clusterSheetProducts != null && clusterSheetProducts.length > 0 && (
        <MarketMapClusterSheet
          products={clusterSheetProducts}
          thumbnailSrc={productThumbnail}
          userLocation={userLoc}
          onClose={() => setClusterSheetProducts(null)}
          onOpenDetail={(p) => {
            setClusterSheetProducts(null);
            handleOpenDetail(p, "map_cluster_sheet");
          }}
        />
      )}
    </div>
  );
}
