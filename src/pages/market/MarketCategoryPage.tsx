import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "./ProductCard";
import { parseMarketProduct } from "@/types/market";
import type { MarketProduct } from "@/types/market";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getDistanceKm } from "@/utils/geo";
import OptimizedProductMap from "@/components/market/OptimizedProductMap";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

type ItemWithDistance = {
  item: MarketProduct;
  distanceKm?: number;
};

export default function MarketCategoryPage() {
  const navigate = useNavigate();
  const { sport = "soccer" } = useParams<{ sport: string }>();
  const viewStateKey = `marketCategoryView:${sport}`;
  const [items, setItems] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nearOnly, setNearOnly] = useState(true);
  const [radiusKm, setRadiusKm] = useState(5);
  const { loc: userLoc } = useUserLocation();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665,
    lng: 126.978,
  });
  const [pendingCenter, setPendingCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [showSearchBtn, setShowSearchBtn] = useState(false);
  const [hasRestoredState, setHasRestoredState] = useState(false);

  const sportLabel = useMemo(() => {
    const map: Record<string, string> = {
      soccer: "축구",
      basketball: "농구",
      baseball: "야구",
      futsal: "풋살",
      badminton: "배드민턴",
    };
    return map[sport] ?? sport;
  }, [sport]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, "marketProducts"),
          where("sport", "==", sport),
          orderBy("createdAt", "desc"),
          limit(30)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setItems(snap.docs.map((d) => parseMarketProduct(d)));
      } catch (e) {
        console.error("❌ [MarketCategoryPage] 조회 실패:", e);
        if (!cancelled) setError("종목 상품을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sport]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(viewStateKey);
      if (!raw) {
        setHasRestoredState(true);
        return;
      }
      const parsed = JSON.parse(raw) as {
        nearOnly?: boolean;
        radiusKm?: number;
        selectedProductId?: string | null;
        mapCenter?: { lat: number; lng: number } | null;
      };
      if (typeof parsed.nearOnly === "boolean") setNearOnly(parsed.nearOnly);
      if (typeof parsed.radiusKm === "number") setRadiusKm(parsed.radiusKm);
      if (typeof parsed.selectedProductId === "string" || parsed.selectedProductId === null) {
        setSelectedProductId(parsed.selectedProductId ?? null);
      }
      if (
        parsed.mapCenter &&
        typeof parsed.mapCenter.lat === "number" &&
        typeof parsed.mapCenter.lng === "number"
      ) {
        setMapCenter(parsed.mapCenter);
      }
    } catch {
      // noop
    } finally {
      setHasRestoredState(true);
    }
  }, [viewStateKey]);

  useEffect(() => {
    if (!hasRestoredState) return;
    const payload = {
      nearOnly,
      radiusKm,
      selectedProductId,
      mapCenter,
    };
    try {
      sessionStorage.setItem(viewStateKey, JSON.stringify(payload));
    } catch {
      // noop
    }
  }, [hasRestoredState, nearOnly, radiusKm, selectedProductId, mapCenter, viewStateKey]);

  useEffect(() => {
    if (!userLoc) return;
    if (!hasRestoredState) return;
    // 복원된 중심 좌표가 있으면 우선 사용한다.
    const hasSavedCenter = !!sessionStorage.getItem(viewStateKey);
    if (hasSavedCenter) return;
    setMapCenter({ lat: userLoc.lat, lng: userLoc.lng });
  }, [hasRestoredState, userLoc?.lat, userLoc?.lng, viewStateKey]);

  useEffect(() => {
    if (!selectedProductId) return;
    const existsInList = items.some((item) => item.id === selectedProductId);
    if (!existsInList) setSelectedProductId(null);
  }, [items, selectedProductId]);

  useEffect(() => {
    if (!pendingCenter) return;
    const timer = setTimeout(() => {
      setMapCenter(pendingCenter);
      setShowSearchBtn(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingCenter]);

  const itemsWithDistance = useMemo<ItemWithDistance[]>(() => {
    const base = mapCenter;
    return items
      .map((item) => {
        if (item.latitude == null || item.longitude == null) {
          return { item, distanceKm: undefined };
        }
        const distanceKm = getDistanceKm(base, { lat: item.latitude, lng: item.longitude });
        return { item, distanceKm };
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [items, mapCenter]);

  const filteredItems = useMemo(() => {
    if (!nearOnly) return itemsWithDistance;
    return itemsWithDistance.filter(
      ({ distanceKm }) => typeof distanceKm === "number" && distanceKm <= radiusKm
    );
  }, [itemsWithDistance, nearOnly, radiusKm]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{sportLabel} 거래</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/market")}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            전체 보기
          </button>
          <button
            type="button"
            onClick={() => setNearOnly((prev) => !prev)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              nearOnly
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            {nearOnly ? "근처만 보기 ON" : "전체 보기 OFF"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {[1, 3, 5, 10].map((km) => (
          <button
            key={km}
            type="button"
            onClick={() => setRadiusKm(km)}
            disabled={!nearOnly}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              radiusKm === km
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {km}km
          </button>
        ))}
        <span className="text-xs text-gray-500">
          {nearOnly ? `지도 중심 ${radiusKm}km 이내 ${filteredItems.length}개` : `전체 ${items.length}개`}
        </span>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-gray-200">
        <OptimizedProductMap
          products={filteredItems.map(({ item }) => item)}
          center={mapCenter}
          zoom={14}
          height="280px"
          userLocation={userLoc}
          selectedProductId={selectedProductId}
          onProductClick={(product) => {
            setSelectedProductId(product.id);
            navigate(sportMarketDetailUrl(sport, product.id));
          }}
          onIdle={(center) => {
            const movedLat = Math.abs(center.lat - mapCenter.lat);
            const movedLng = Math.abs(center.lng - mapCenter.lng);
            if (movedLat < 0.0002 && movedLng < 0.0002) return;
            setPendingCenter(center);
            setShowSearchBtn(true);
          }}
        />
        {showSearchBtn && pendingCenter ? (
          <button
            type="button"
            onClick={() => {
              setMapCenter(pendingCenter);
              setShowSearchBtn(false);
            }}
            className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow"
          >
            🔍 이 지역에서 검색
          </button>
        ) : null}
      </div>

      {loading ? <p className="py-10 text-center text-sm text-gray-500">불러오는 중...</p> : null}
      {error ? <p className="py-10 text-center text-sm text-red-500">{error}</p> : null}
      {!loading && !error && filteredItems.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          {nearOnly ? `${radiusKm}km 이내 상품이 없습니다.` : `등록된 ${sportLabel} 상품이 없습니다.`}
        </p>
      ) : null}

      {!loading && !error && filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map(({ item, distanceKm }) => (
            <div
              key={item.id}
              className={`rounded-2xl transition ${
                selectedProductId === item.id ? "ring-2 ring-blue-500 ring-offset-2" : ""
              }`}
              onMouseEnter={() => setSelectedProductId(item.id)}
            >
              <ProductCard
                product={item}
                distanceKm={distanceKm}
                sortMode={nearOnly ? "nearest" : "latest"}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
