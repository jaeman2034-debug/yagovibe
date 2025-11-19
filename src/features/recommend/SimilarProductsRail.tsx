import MarketCard from "@/components/MarketCard";
import type { AIProduct } from "./useSimilarProducts";

type Props = {
  items: AIProduct[];
  title?: string;
};

export default function SimilarProductsRail({ items, title = "비슷한 상품" }: Props) {
  if (!items?.length) return null;

  return (
    <section className="mt-6">
      <h4 className="mb-2 text-base font-semibold">{title}</h4>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((product) => (
          <MarketCard
            key={product.id}
            id={product.id}
            name={product.name}
            imageUrl={product.imageUrl}
            category={product.category}
          />
        ))}
      </div>
    </section>
  );
}

