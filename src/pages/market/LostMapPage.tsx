import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketProduct } from "@/types/market";
import { parseMarketProduct } from "@/types/market";
import OptimizedProductMap from "@/components/market/OptimizedProductMap";
import { useUserLocation } from "@/hooks/useUserLocation";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

export default function LostMapPage() {
  const navigate = useNavigate();
  const { loc: userLoc } = useUserLocation();
  const [items, setItems] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MarketProduct | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, "marketProducts"), where("type", "==", "lost"), limit(100));
        const snap = await getDocs(q);
        if (cancelled) return;
        setItems(snap.docs.map((d) => parseMarketProduct(d)));
      } catch (e) {
        console.error("❌ [LostMapPage] 유실물 조회 실패:", e);
        if (!cancelled) setError("유실물 지도를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapCenter = useMemo(() => {
    if (selected?.latitude != null && selected?.longitude != null) {
      return { lat: selected.latitude, lng: selected.longitude };
    }
    if (userLoc) return userLoc;
    return { lat: 37.5665, lng: 126.978 };
  }, [selected?.latitude, selected?.longitude, userLoc?.lat, userLoc?.lng]);

  const mapItems = useMemo(
    () => items.filter((it) => it.latitude != null && it.longitude != null),
    [items]
  );

  return (
    <div className="relative h-[calc(100vh-120px)] min-h-[520px] w-full overflow-hidden">
      <div className="absolute left-4 top-4 z-20 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow">
        <p className="text-sm font-semibold text-gray-900">📍 유실물 지도</p>
        <p className="text-xs text-gray-500">마커를 눌러 상세를 확인하세요</p>
      </div>

      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">유실물 지도 로딩 중...</div>
      ) : null}
      {error ? (
        <div className="flex h-full items-center justify-center text-sm text-red-500">{error}</div>
      ) : null}
      {!loading && !error ? (
        <OptimizedProductMap
          products={mapItems}
          center={mapCenter}
          zoom={14}
          height="100%"
          userLocation={userLoc}
          selectedProductId={selected?.id ?? null}
          onProductClick={(product) => setSelected(product)}
        />
      ) : null}

      {selected ? (
        <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex items-start gap-3">
            <img
              src={selected.imageUrl || "/placeholder-image.png"}
              alt={selected.name || "유실물"}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{selected.name || "유실물"}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{selected.description || "설명이 없습니다."}</p>
              <p className="mt-1 text-[11px] text-gray-500">{selected.address || selected.dong || "위치 정보"}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(
                  sportMarketDetailUrl(
                    (selected as MarketProduct & { sport?: string }).sport || resolveLastSportId(),
                    selected.id
                  )
                )
              }
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              상세보기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
