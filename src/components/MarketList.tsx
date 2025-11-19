import MarketCard from "./MarketCard";

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  date: string;
  location?: string;
  likes?: number;
  comments?: number;
}

export default function MarketList({ products }: { products: Product[] }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-4">
      {products.map((product) => (
        <MarketCard
          key={product.id}
          imageUrl={product.imageUrl}
          name={product.name}
          location={product.location}
          date={product.date}
          price={product.price}
          likes={product.likes ?? 0}
          comments={product.comments ?? 0}
        />
      ))}
    </div>
  );
}

