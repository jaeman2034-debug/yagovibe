import { X } from "lucide-react";
import type { MarketProduct } from "@/types/market";
import { formatDistance } from "@/utils/formatDistance";
import { getDistanceKm } from "@/utils/geo";
import { productLatLngForDirections } from "@/utils/mapDirections";

type Props = {
  products: MarketProduct[];
  thumbnailSrc: (p: MarketProduct) => string;
  userLocation?: { lat: number; lng: number } | null;
  onClose: () => void;
  onOpenDetail: (product: MarketProduct) => void;
};

function titleOf(p: MarketProduct): string {
  const any = p as { title?: string; name?: string };
  return (
    (typeof any.title === "string" && any.title.trim()) ||
    (typeof any.name === "string" && any.name.trim()) ||
    "상품"
  );
}

/**
 * 마켓 지도 — 클러스터(숫자 원) 탭 시 같은 묶음 내 상품 목록 바텀 시트
 */
export default function MarketMapClusterSheet({
  products,
  thumbnailSrc,
  userLocation,
  onClose,
  onOpenDetail,
}: Props) {
  return (
    <>
      <button
        type="button"
        className="fixed top-0 right-0 left-0 z-[60] bg-black/35"
        style={{ bottom: "4rem" }}
        aria-label="목록 닫기"
        onClick={onClose}
      />
      <div
        className="fixed right-0 left-0 z-[61] flex max-h-[min(58dvh,520px)] min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.15)] dark:border-gray-700 dark:bg-gray-900"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-cluster-sheet-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p id="map-cluster-sheet-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            이 위치 상품 {products.length}개
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {products.map((p) => {
            const pos = productLatLngForDirections(p);
            const km =
              userLocation && pos ? getDistanceKm(userLocation, pos) : null;
            const distLabel = km != null ? `내 위치 기준 ${formatDistance(km)}` : null;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenDetail(p)}
                className="flex w-full gap-3 border-b border-gray-100 py-3 text-left transition last:border-b-0 hover:bg-gray-50/90 dark:border-gray-800 dark:hover:bg-gray-800/60"
              >
                <img
                  src={thumbnailSrc(p)}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{titleOf(p)}</p>
                  <p className="mt-0.5 text-sm font-bold text-blue-600 dark:text-blue-400">
                    {typeof p.price === "number" ? `${p.price.toLocaleString("ko-KR")}원` : "가격 미정"}
                  </p>
                  {distLabel ? (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{distLabel}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
