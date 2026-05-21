/**
 * ?뵦 ?먮ℓ???섏씠吏
 *
 * - ?먮ℓ???꾨줈?? * - ?깅줉 ?곹뭹 紐⑸줉
 * - 嫄곕옒 ?잛닔(由щ럭 湲곕컲)
 */

import { useState, useEffect } from "react";

const sellerPageStyles = `
  /* ?뵦 紐⑤컮?? main.app-scroll?먯꽌 ?ㅻ뜑 ?щ갚 泥섎━ ??理쒖냼 */
  .market-seller-main {
    padding-top: 4px;
    padding-left: 16px;
    padding-right: 16px;
  }
  /* ?뵦 ?곗뒪?ы넲(768px~): AppShell main???대? ?ㅻ뜑 ?щ갚??媛吏誘濡??곷떒? 理쒖냼??*/
  @media (min-width: 768px) {
    .market-seller-main {
      padding-top: 16px;
      padding-left: 24px;
      padding-right: 24px;
    }
  }
  /* ?뵦 ?곗뒪?ы넲: max-width ?뺣?濡?醫뚯슦 ?щ갚 異뺤냼 (1200??400) */
  .seller-page-container {
    max-width: 1400px;
    margin: 0 auto;
  }
  .seller-product-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 768px) {
    .seller-product-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (min-width: 1200px) {
    .seller-product-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  .seller-product-card {
    border-radius: 12px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .seller-product-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  }
  .seller-product-image-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: #f3f4f6;
  }
  .seller-product-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .seller-status-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
  }
`;
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSellerReviewStats } from "@/services/marketReviewService";
import { User } from "lucide-react";
import Header from "@/layout/Header";
import type { MarketPost } from "@/features/market/types";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

interface SellerProfile {
  displayName?: string;
  photoURL?: string;
  trustScore?: number;
  completedSales?: number;
  reviewCount?: number;
}

export default function MarketSellerPage() {
  const { sport, sellerId } = useParams<{ sport: string; sellerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<MarketPost[]>([]);
  const [reviewStats, setReviewStats] = useState<{ totalReviews: number; averageRating: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"latest" | "priceAsc" | "priceDesc">("latest");

  useEffect(() => {
    if (!sellerId) {
      setError("?먮ℓ???뺣낫媛 ?놁뒿?덈떎.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sellerDoc, productsSnap, stats] = await Promise.all([
          getDoc(doc(db, "users", sellerId)),
          getDocs(
            query(
              collection(db, "market"),
              where("authorId", "==", sellerId),
              limit(20)
            )
          ).catch(() =>
            getDocs(
              query(collection(db, "market"), where("userId", "==", sellerId), limit(20))
            )
          ),
          getSellerReviewStats(sellerId).catch(() => ({ totalReviews: 0, averageRating: 0 })),
        ]);

        if (!sellerDoc.exists()) {
          setError("?먮ℓ?먮? 李얠쓣 ???놁뒿?덈떎.");
          setSeller(null);
        } else {
          const d = sellerDoc.data();
          setSeller({
            displayName: d?.displayName || "판매자",
            photoURL: d?.photoURL,
            trustScore: d?.trustScore,
            completedSales: d?.completedSales,
            reviewCount: d?.reviewCount,
          });
        }

        setReviewStats({ totalReviews: stats.totalReviews, averageRating: stats.averageRating });

        const list: MarketPost[] = productsSnap.docs
          .sort((a, b) => {
            const aT = a.data()?.createdAt?.toMillis?.() ?? 0;
            const bT = b.data()?.createdAt?.toMillis?.() ?? 0;
            return bT - aT;
          })
          .map((docSnap) => {
          const data = docSnap.data();
          const title = data.title || data.name || "";
          const images = data.images || (data.imageUrl ? [data.imageUrl] : []);
          return {
            id: docSnap.id,
            sport: (data.sport || "etc") as any,
            category: (data.category || "equipment") as any,
            title,
            description: data.description || "",
            price: typeof data.price === "number" ? data.price : data.price ? Number(data.price) : undefined,
            location: data.location || data.locationText || data.address || "",
            images,
            thumbnailUrl: data.thumbnailUrl || images[0],
            status: (data.status || "active") as any,
            authorId: data.authorId || data.userId || sellerId,
            authorName: data.authorName || data.displayName,
            createdAt: data.createdAt,
            viewCount: data.viewCount || 0,
            likeCount: data.likeCount || 0,
          };
        });
        setProducts(list);
      } catch (err: any) {
        console.error("??[MarketSellerPage] 濡쒕뱶 ?ㅽ뙣:", err);
        setError("?뺣낫瑜?遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [sellerId]);

  const handleProductClick = (postId: string) => {
    const s = sport || "soccer";
    navigate(sportMarketDetailUrl(s, postId));
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === "latest") {
      const aT = (a.createdAt as any)?.toMillis?.() ?? (a.createdAt as number) ?? 0;
      const bT = (b.createdAt as any)?.toMillis?.() ?? (b.createdAt as number) ?? 0;
      return bT - aT;
    }
    const aP = a.price ?? 0;
    const bP = b.price ?? 0;
    if (sortBy === "priceAsc") return aP - bP;
    return bP - aP; // priceDesc
  });

  const completedCount = products.filter(
    (p) => p.status === "completed" || p.status === "done"
  ).length;

  if (loading) {
    return (
      <div className="market-seller-layout min-h-screen bg-gray-50">
        <style>{sellerPageStyles}</style>
        <Header />
        <main className="market-seller-main px-4 pb-8">
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">?먮ℓ???뺣낫瑜?遺덈윭?ㅻ뒗 以?..</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="market-seller-layout min-h-screen bg-gray-50">
        <style>{sellerPageStyles}</style>
        <Header />
        <main className="market-seller-main px-4 pb-8">
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              ?ㅻ줈媛湲?            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="market-seller-layout min-h-screen bg-gray-50">
      <style>{sellerPageStyles}</style>
      <Header />
      <main className="market-seller-main px-4 pb-24">
        <div className="seller-page-container">
        {/* ?먮ℓ???꾨줈??*/}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {seller?.photoURL ? (
                <img
                  src={seller.photoURL}
                  alt={seller.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {seller?.displayName || "판매자"}
              </h1>
              {/* 판매자 통계: 등록 상품 | 거래 완료 | 평점 */}
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 flex-wrap">
                <span>등록 상품 {products.length}개</span>
                <span className="text-gray-300">|</span>
                <span>거래 완료 {completedCount}건</span>
                <span className="text-gray-300">|</span>
                <span>
                  평점{" "}
                  {reviewStats && reviewStats.averageRating > 0
                    ? `⭐ ${reviewStats.averageRating.toFixed(1)}`
                    : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ?곹뭹 紐⑸줉 */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">등록 상품</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "latest" | "priceAsc" | "priceDesc")}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="latest">최신순</option>
              <option value="priceAsc">가격 낮은순</option>
              <option value="priceDesc">가격 높은순</option>
            </select>
          </div>
          {products.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
              등록된 상품이 없습니다.
            </div>
          ) : (
            <div className="seller-product-grid">
              {sortedProducts.map((p) => {
                const statusLabel =
                  p.status === "reserved"
                    ? "예약중"
                    : p.status === "completed" || p.status === "done"
                      ? "거래완료"
                      : "판매중";
                const statusColor =
                  p.status === "reserved"
                    ? "bg-amber-100 text-amber-800"
                    : p.status === "completed" || p.status === "done"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-emerald-100 text-emerald-800";
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProductClick(p.id)}
                    className="seller-product-card border border-gray-200 text-left"
                  >
                    <div className="relative seller-product-image-wrap">
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={p.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <span className="text-xs">이미지 없음</span>
                        </div>
                      )}
                      <span className={`seller-status-badge ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-gray-900 text-sm line-clamp-2">{p.title}</p>
                      {p.price != null && p.price > 0 ? (
                        <p className="text-blue-600 font-semibold text-sm mt-1">
                          {p.price.toLocaleString()}원
                        </p>
                      ) : (
                        <p className="text-gray-500 text-sm mt-1">무료 나눔</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}

