import { ProductCard } from "@/pages/market/ProductCard";
import type { MarketProduct } from "@/types/market";

interface MarketGridProps {
  products: MarketProduct[];
  onSelectProduct?: (product: MarketProduct) => void;
}

export default function MarketGrid({ products, onSelectProduct }: MarketGridProps) {
  return (
    <main className="bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🛒 마켓</h1>
          <span className="text-sm text-gray-500">지금 등록된 최신 상품을 살펴보세요</span>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onClick={onSelectProduct} />
          ))}
        </section>
      </div>
    </main>
  );
}
