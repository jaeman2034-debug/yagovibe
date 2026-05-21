import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

export default function ReviewHeatmapDashboard() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const navigate = useNavigate();

  // 🔥 Firestore 리뷰 실시간 구독
  useEffect(() => {
    const q = query(collection(db, "marketReviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setReviews(data);
        setLoading(false);
      },
      (error) => {
        console.error("🔥 Firestore 리뷰 에러:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // 상품별 감정 점수 계산
  const grouped = reviews.reduce((acc: any, r: any) => {
    const pid = r.productId || "unknown";
    if (!acc[pid]) {
      acc[pid] = {
        reviews: [],
        name: r.productName || pid,
      };
    }
    acc[pid].reviews.push({
      score: r.sentimentScore || r.rating || 3,
      text: r.text,
      user: r.user,
      createdAt: r.createdAt,
    });
    return acc;
  }, {});

  const products = Object.keys(grouped).map((pid) => {
    const product = grouped[pid];
    const scores = product.reviews.map((r: any) => r.score);
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const trust = Math.max(0, Math.min(100, 100 - stdDev * 20)); // 신뢰도 계산 (표준편차 기반)

    return {
      id: pid,
      name: product.name,
      avg: Number(avg.toFixed(2)),
      trust: Math.round(trust),
      stdDev: Number(stdDev.toFixed(2)),
      reviewCount: scores.length,
      reviews: product.reviews,
    };
  });

  // 평균 점수 순으로 정렬
  products.sort((a, b) => b.avg - a.avg);

  // 색상 계산 함수
  const getColor = (score: number) => {
    if (score >= 4) return "bg-blue-500"; // 긍정 (파랑)
    if (score >= 3) return "bg-gray-500"; // 중립 (회색)
    return "bg-red-500"; // 부정 (빨강)
  };

  const getColorIntensity = (score: number) => {
    if (score >= 4) return Math.min(100, (score - 4) * 100); // 4.0-5.0 → 0-100%
    if (score >= 3) return Math.min(100, (score - 3) * 100); // 3.0-4.0 → 0-100%
    return Math.min(100, (3 - score) * 100); // 0-3.0 → 100-0%
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen pb-24">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
        🔥 AI 리뷰 감정 히트맵
      </h1>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        <p>총 {reviews.length}개의 리뷰, {products.length}개의 상품</p>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>긍정 (≥4.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span>중립 (3.0-4.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>부정 (&lt;3.0)</span>
          </div>
        </div>
      </div>

      {/* 히트맵 그리드 */}
      <Card className="mb-6 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const intensity = getColorIntensity(product.avg);
              const colorClass = getColor(product.avg);
              const opacity = Math.max(0.4, intensity / 100);

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={`${colorClass} rounded-lg p-4 cursor-pointer hover:scale-105 transition-transform text-white shadow-lg`}
                  style={{ opacity }}
                >
                  <div className="font-semibold text-sm mb-2 truncate">
                    {product.name.length > 20 ? product.name.substring(0, 20) + "..." : product.name}
                  </div>
                  <div className="text-2xl font-bold mb-1">{product.avg}</div>
                  <div className="text-xs opacity-90">
                    신뢰도 {product.trust}% | 리뷰 {product.reviewCount}개
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 상품별 상세 정보 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold mb-3">📊 상품별 상세 통계</h2>
        {products.map((product) => {
          const colorClass = getColor(product.avg);
          const isSelected = selectedProduct === product.id;

          return (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-indigo-500 shadow-lg" : "hover:shadow-md"
              }`}
              onClick={() => setSelectedProduct(isSelected ? null : product.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-500">상품 ID: {product.id}</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded-full text-white ${colorClass}`}>
                      {product.avg}점
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">평균 점수</p>
                    <p className="text-lg font-semibold">{product.avg}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">신뢰도</p>
                    <p className="text-lg font-semibold">{product.trust}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">표준편차</p>
                    <p className="text-lg font-semibold">{product.stdDev}</p>
                  </div>
                </div>

                {/* 진행 바 */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all ${colorClass}`}
                    style={{ width: `${(product.avg / 5) * 100}%` }}
                  />
                </div>

                {/* 리뷰 개수 */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    리뷰 {product.reviewCount}개
                  </span>
                  {product.avg >= 4 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : product.avg < 3 ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : null}
                </div>

                {/* 선택 시 상세 리뷰 표시 */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h4 className="font-semibold mb-2">📝 상세 리뷰</h4>
                    {product.reviews.map((review: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium">{review.user || "익명"}</span>
                          <span className="text-xs text-gray-500">
                            {review.createdAt?.toDate
                              ? new Date(review.createdAt.toDate()).toLocaleDateString("ko-KR")
                              : "날짜 없음"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          {review.text || "내용 없음"}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">점수:</span>
                          <span className={`text-sm font-semibold ${colorClass} text-white px-2 py-0.5 rounded`}>
                            {review.score}
                          </span>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() =>
                        navigate(
                          sportMarketDetailUrl(
                            (product as { sport?: string }).sport || resolveLastSportId(),
                            product.id
                          )
                        )
                      }
                    >
                      상품 상세 페이지로 이동
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            리뷰 데이터가 없습니다. 리뷰를 등록해주세요.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

