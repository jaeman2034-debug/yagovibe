import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { MarketProduct } from "@/types/market";
import { useProductAI } from "@/features/ai/useProductAI";

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='320'>
      <rect width='100%' height='100%' fill='#f3f4f6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='18'>image not available</text>
    </svg>`
  );

type ProductModalProps = {
  product: MarketProduct | null;
  onClose: () => void;
};

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const { ai, loading } = useProductAI(product as any);
  return (
    <AnimatePresence>
      {product && (
        <motion.div
          key={product.id}
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-gray-600 shadow hover:text-gray-900"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
              닫기
            </button>

            <div className="product-detail flex h-64 w-full items-center justify-center overflow-hidden bg-gray-100">
              <div className="w-full max-w-full overflow-hidden flex justify-center min-w-0" style={{ maxWidth: '100%' }}>
                <img
                  src={product.imageUrl || FALLBACK_IMAGE}
                  alt={product.name || "상품 이미지"}
                  loading="lazy"
                  className="max-w-full h-auto object-contain block"
                  style={{ maxWidth: '100%', height: 'auto' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                />
              </div>
            </div>

            <div className="space-y-5 px-7 py-8">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-gray-900">
                  {product.name || "이름 미정"}
                </h2>
                {typeof product.price === "number" && (
                  <p className="mt-2 flex items-center gap-2 text-lg font-bold text-blue-600">
                    {product.price.toLocaleString()}원
                  </p>
                )}
                <p className="mt-2 text-sm uppercase tracking-wide text-gray-500">
                  {product.category || "기타"} · {product.location || product.region || "KR"}
                </p>
              </div>

              {Array.isArray(product.aiLabels) && product.aiLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.aiLabels.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {product.description && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                    상품 설명
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
                </section>
              )}

              {/* ▼ AI 분석 패널 */}
              <div className="transition-all duration-300 ease-out rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-bold text-gray-800 mb-2">🔎 AI 상품 분석</h3>
                {loading && (
                  <div className="text-sm text-gray-500 animate-pulse">
                    AI가 상품을 분석하고 있습니다...
                  </div>
                )}
                {!loading && ai && (
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>
                      <span className="font-semibold text-gray-900">AI 카테고리:</span>{" "}
                      {ai.aiCategory}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">상태 판단:</span>{" "}
                      {ai.aiCondition}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">추천 가격:</span>{" "}
                      <span className="text-blue-600 font-semibold">
                        {ai.aiRecommendedPrice.toLocaleString()}원
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{ai.aiSummary}</p>
                  </div>
                )}
              </div>

              {product.aiSummary && (
                <div className="rounded-2xl bg-gray-900 px-4 py-3 text-sm leading-relaxed text-gray-100 shadow-lg">
                  {product.aiSummary}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-[#111] text-white hover:bg-[#222]">
                  문의하기
                </button>
                <button className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                  관심목록
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

