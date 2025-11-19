import type { Product } from "@/types/product";

type RecommendedRailProps = {
  category?: string;
  products?: Product[];
  title?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 12;

export function RecommendedRail({
  category,
  products = [],
  title = "추천 상품",
  limit = DEFAULT_LIMIT,
}: RecommendedRailProps) {
  const source: Product[] = Array.isArray(products) ? products : [];

  const recommended = source
    .filter((product) => {
      if (!product) return false;
      if (!category || category === "전체") return true;
      return product.category === category;
    })
    .sort((a, b) => {
      const aTime =
        a?.createdAt?.toMillis?.() ??
        (a?.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bTime =
        b?.createdAt?.toMillis?.() ??
        (b?.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return bTime - aTime;
    })
    .slice(0, limit);

  if (!recommended.length) return null;

  return (
    <section className="recommended-grid mt-12 max-w-3xl mx-auto">
      <h2 className="col-span-full text-xl font-bold text-textMain">{title}</h2>
      {recommended.map((product) => {
          const priceLabel =
            typeof product?.price === "number"
              ? `${product.price.toLocaleString()}원`
              : "가격 미정";

          return (
            <article
              key={product.id}
              className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                {product?.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product?.name || "상품 이미지"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    이미지 없음
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between text-sm">
                <p className="truncate font-semibold text-textMain">
                  {product?.name || "상품명 없음"}
                </p>
                <p className="text-primary font-semibold">{priceLabel}</p>
              </div>
            </article>
          );
        })}
    </section>
  );
}

export default RecommendedRail;
