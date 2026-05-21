import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, MapPin, X } from "lucide-react";
import type { MarketProduct } from "@/types/market";
import { openGoogleDirectionsTo, productLatLngForDirections } from "@/utils/mapDirections";

type Snap = "peek" | "tall";

type Props = {
  product: MarketProduct;
  thumbnailSrc: string;
  distanceLabel: string | null;
  onClose: () => void;
  onOpenDetail: () => void;
  /** peek / tall 변경 시 지도 padding 등 부모 동기화 */
  onSnapChange?: (snap: Snap) => void;
  /** 있으면 구글 길찾기 URL에 출발지로 포함 */
  userLocation?: { lat: number; lng: number } | null;
};

function getConditionHint(product: MarketProduct): string | null {
  const any = product as Record<string, unknown>;
  const c = any.condition ?? any.grade ?? any.itemCondition;
  if (typeof c === "string" && c.trim()) return c.trim();
  const cat = (product.category ?? "").toLowerCase();
  if (cat.includes("중고")) return "중고";
  if (cat.includes("새") || cat.includes("new")) return "새상품";
  return null;
}

function buildLocationSubtitle(product: MarketProduct, distanceLabel: string | null): string {
  const parts = [product.dong, product.region || product.location, product.address]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());
  const uniq = [...new Set(parts)];
  const place = uniq.slice(0, 2).join(" · ");
  if (place && distanceLabel) return `${place} · ${distanceLabel}`;
  if (place) return place;
  if (distanceLabel) return distanceLabel;
  return "";
}

/**
 * 마켓 지도용: 핸들 바 드래그로 peek ↔ 확장 스냅 (framer-motion, React 19 호환)
 */
export default function MarketMapProductSheet({
  product,
  thumbnailSrc,
  distanceLabel,
  onClose,
  onOpenDetail,
  onSnapChange,
  userLocation = null,
}: Props) {
  const [snap, setSnap] = useState<Snap>("peek");

  useEffect(() => {
    setSnap("peek");
  }, [product.id]);

  useEffect(() => {
    const id = requestAnimationFrame(() => onSnapChange?.(snap));
    return () => cancelAnimationFrame(id);
  }, [snap, onSnapChange]);

  const title = product.name || (product as { title?: string }).title || "상품";

  const detailText =
    [product.aiOneLine, product.summary, product.description].find(
      (s): s is string => typeof s === "string" && s.trim().length > 0
    )?.trim() ?? null;

  const metaLine = [product.category, product.region || product.location, product.dong]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join(" · ");

  const locationSubtitle = buildLocationSubtitle(product, distanceLabel);
  const conditionHint = getConditionHint(product);

  const openDetailFromCard = () => {
    onOpenDetail();
  };

  const destPos = productLatLngForDirections(product);
  const leftLocationLabel =
    locationSubtitle.length > 0
      ? locationSubtitle
      : distanceLabel ?? (destPos ? "지도 위치" : "");
  const showLocationRow = leftLocationLabel.length > 0 || destPos != null;

  const openDirections = () => {
    if (!destPos) return;
    openGoogleDirectionsTo(destPos, userLocation ?? null);
  };

  return (
    <>
      <button
        type="button"
        className="fixed top-0 right-0 left-0 z-[60] bg-black/35"
        style={{ bottom: "4rem" }}
        aria-label="상품 카드 닫기"
        onClick={onClose}
      />
      <motion.div
        layout
        initial={false}
        animate={{ maxHeight: snap === "peek" ? "38vh" : "72vh" }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className="fixed right-0 left-0 z-[61] flex min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.15)] dark:border-gray-700 dark:bg-gray-900"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <motion.div
          className="shrink-0 cursor-grab touch-none py-2.5 active:cursor-grabbing"
          onPanEnd={(_, info) => {
            if (info.offset.y < -36 || info.velocity.y < -420) setSnap("tall");
            else if (info.offset.y > 36 || info.velocity.y > 420) setSnap("peek");
          }}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          <p className="mt-1 text-center text-[10px] text-gray-400 dark:text-gray-500">
            위아래로 드래그해 높이 조절
          </p>
        </motion.div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* 썸네일·본문은 탭 시 상세 — 닫기만 별도(중첩 button·role 충돌 없음) */}
          <div className="rounded-2xl px-1 py-1 transition hover:bg-gray-50/90 dark:hover:bg-gray-800/60">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={openDetailFromCard}
                className="shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={`${title} 상세 보기`}
              >
                <img src={thumbnailSrc} alt="" className="h-20 w-20 rounded-lg object-cover" />
              </button>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={openDetailFromCard}
                    className="min-w-0 flex-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="닫기"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openDetailFromCard}
                  className="mt-1 w-full rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {typeof product.price === "number"
                      ? `${product.price.toLocaleString("ko-KR")}원`
                      : "가격 미정"}
                  </p>
                </button>
                {showLocationRow && (
                  <div className="mt-1 flex items-start justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <p className="flex min-w-0 flex-1 items-start gap-1">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                      <span className="min-w-0 leading-snug">{leftLocationLabel}</span>
                    </p>
                    {destPos != null && (
                      <button
                        type="button"
                        onClick={openDirections}
                        className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50/90 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        aria-label="길찾기 열기"
                      >
                        길찾기
                        <ChevronRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
                      </button>
                    )}
                  </div>
                )}
                {(conditionHint || detailText) && (
                  <button
                    type="button"
                    onClick={openDetailFromCard}
                    className="mt-1 w-full rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {conditionHint && (
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        {conditionHint}
                      </p>
                    )}
                    {detailText && (
                      <p
                        className={`line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400 ${conditionHint ? "mt-1" : ""}`}
                      >
                        {detailText}
                      </p>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {snap === "tall" && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 space-y-2 overflow-hidden border-t border-gray-100 pt-3 dark:border-gray-700/80"
              >
                {metaLine.length > 0 && (
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{metaLine}</p>
                )}
                {typeof product.description === "string" &&
                  product.description.trim().length > 0 &&
                  product.description.trim() !== (detailText ?? "").trim() && (
                    <p className="line-clamp-8 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      {product.description.trim()}
                    </p>
                  )}
                {!metaLine &&
                  !(typeof product.description === "string" && product.description.trim().length > 0) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      추가 설명이 없습니다. 상세에서 확인해 보세요.
                    </p>
                  )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 카드 본문이 이미 상세 탭 영역 — 보조 CTA만 가볍게 */}
          <div className="mt-2 flex justify-end border-t border-gray-100 pt-2 dark:border-gray-700/70">
            <button
              type="button"
              onClick={onOpenDetail}
              className="inline-flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50/80 hover:underline dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              상세 보기
              <ChevronRight className="h-4 w-4 opacity-80" aria-hidden />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
