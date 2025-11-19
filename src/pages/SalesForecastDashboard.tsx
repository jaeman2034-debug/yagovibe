import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function SalesForecastDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // 🔹 Firestore 데이터 로드 (상품별 리뷰/조회수/판매)
  useEffect(() => {
    const q = query(collection(db, "marketStats"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const stats = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setData(stats);
        setLoading(false);
      },
      (error) => {
        console.error("🔥 Firestore 통계 에러:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // 🔹 AI 예측 요청
  const handleForecast = async () => {
    if (data.length === 0) {
      alert("분석할 통계 데이터가 없습니다.");
      return;
    }

    setAnalyzing(true);
    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(`${functionsOrigin}/forecastSales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats: data }),
      });

      if (!response.ok) {
        throw new Error(`AI 예측 실패: ${response.statusText}`);
      }

      const result = await response.json();
      setForecast(result);

      // 🎧 TTS 피드백
      const utter = new SpeechSynthesisUtterance(
        `이번 주 예상 판매량은 ${result.totalForecast || 0}개이며, 가장 인기 상품은 ${result.topProduct || "없음"} 입니다.`
      );
      utter.lang = "ko-KR";
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (error: any) {
      console.error("판매 예측 오류:", error);
      alert(`오류 발생: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setAnalyzing(false);
    }
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
        <Sparkles className="text-yellow-400 w-6 h-6" /> AI 판매 예측 대시보드
      </h1>

      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          총 {data.length}개의 상품 통계 데이터가 있습니다.
        </p>
        <Button
          onClick={handleForecast}
          disabled={analyzing || data.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" /> AI 예측 분석 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> AI 예측 실행
            </>
          )}
        </Button>
      </div>

      {forecast && (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 예측 판매량</p>
                <p className="text-2xl font-bold text-indigo-600">{forecast.totalForecast || 0}개</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">가장 인기 상품</p>
                <p className="text-lg font-semibold truncate">{forecast.topProduct || "없음"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">예측 신뢰도</p>
                <p className="text-2xl font-bold text-green-600">
                  {forecast.confidence || "N/A"}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 주간 판매량 추세 */}
          {forecast.weekly && forecast.weekly.length > 0 && (
            <Card className="mb-6 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📈 다음 주 예상 판매량 추세
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={forecast.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="week"
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: "#6366f1", r: 4 }}
                      name="예상 판매량"
                    />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: "#94a3b8", r: 3 }}
                      name="과거 평균"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 예상 인기 상품 TOP 5 */}
          {forecast.topProducts && forecast.topProducts.length > 0 && (
            <Card className="mb-6 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🔥 예상 인기 상품 TOP {forecast.topProducts.length}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={forecast.topProducts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      style={{ fontSize: "11px" }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="predictedSales"
                      fill="#4f46e5"
                      name="예상 판매량"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 상세 상품 예측 테이블 */}
          {forecast.topProducts && forecast.topProducts.length > 0 && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">📊 상품별 예측 상세</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">상품명</th>
                        <th className="text-right p-2">예측 판매량</th>
                        <th className="text-right p-2">신뢰도</th>
                        <th className="text-center p-2">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.topProducts.map((product: any, idx: number) => {
                        const trend = product.trend || "stable";
                        const getTrendIcon = () => {
                          if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
                          if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
                          return null;
                        };
                        const getTrendColor = () => {
                          if (trend === "up") return "text-green-600";
                          if (trend === "down") return "text-red-600";
                          return "text-gray-600";
                        };

                        return (
                          <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-2 font-medium">{product.name}</td>
                            <td className="p-2 text-right font-semibold">
                              {product.predictedSales || 0}개
                            </td>
                            <td className="p-2 text-right">{product.confidence || 0}%</td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getTrendIcon()}
                                <span className={getTrendColor()}>
                                  {trend === "up" ? "상승" : trend === "down" ? "하락" : "보통"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI 리포트 요약 */}
          {forecast.summary && (
            <Card className="mt-6 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3">💬 AI 리포트 요약</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {forecast.summary}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {data.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            통계 데이터가 없습니다. 상품 활동 데이터를 수집해주세요.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

