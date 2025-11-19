import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export default function MarketReviewDashboard() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<any>(null);

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

  // 🧠 AI 리뷰 요약 요청
  const analyzeReviews = async () => {
    if (reviews.length === 0) {
      alert("분석할 리뷰가 없습니다.");
      return;
    }

    setAnalyzing(true);
    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(`${functionsOrigin}/analyzeReviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews }),
      });

      if (!response.ok) {
        throw new Error(`AI 분석 실패: ${response.statusText}`);
      }

      const data = await response.json();
      setSummary(data);

      // 🎧 TTS 요약 읽기
      const utter = new SpeechSynthesisUtterance(
        `이번 주 리뷰 평균 점수 ${data.averageScore}점. 주요 키워드는 ${data.keywords?.join(", ") || "없음"} 입니다.`
      );
      utter.lang = "ko-KR";
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (error: any) {
      console.error("리뷰 분석 오류:", error);
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
        <Sparkles className="text-yellow-400 w-6 h-6" /> AI 리뷰 분석 대시보드
      </h1>

      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          총 {reviews.length}개의 리뷰가 있습니다.
        </p>
        <Button
          onClick={analyzeReviews}
          disabled={analyzing || reviews.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" /> 분석 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> 리뷰 AI 분석 실행
            </>
          )}
        </Button>
      </div>

      {summary && (
        <Card className="mt-6 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="font-semibold text-lg mb-2">
                📊 평균 감정 점수: {summary.averageScore?.toFixed(1) || "0"} / 5
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${((summary.averageScore || 0) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">💬 요약:</p>
              <p className="text-gray-700 dark:text-gray-300">{summary.summary || "요약 없음"}</p>
            </div>

            {summary.keywords && summary.keywords.length > 0 && (
              <div>
                <p className="font-semibold mb-2">🏷️ 핵심 키워드:</p>
                <div className="flex flex-wrap gap-2">
                  {summary.keywords.map((k: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium"
                    >
                      #{k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.sentiment && (
              <div>
                <p className="font-semibold mb-2">😊 감정 분포:</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>긍정</span>
                    <span className="text-green-600 font-semibold">
                      {summary.sentiment.positive || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>중립</span>
                    <span className="text-gray-600 font-semibold">
                      {summary.sentiment.neutral || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>부정</span>
                    <span className="text-red-600 font-semibold">
                      {summary.sentiment.negative || 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 리뷰 목록 */}
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold mb-3">📝 최근 리뷰</h2>
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              등록된 리뷰가 없습니다.
            </CardContent>
          </Card>
        ) : (
          reviews.slice(0, 10).map((review) => (
            <Card key={review.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{review.user || "익명"}</p>
                    {review.rating && (
                      <p className="text-sm text-gray-500">⭐ {review.rating} / 5</p>
                    )}
                  </div>
                  {review.createdAt && (
                    <p className="text-xs text-gray-400">
                      {review.createdAt.toDate
                        ? new Date(review.createdAt.toDate()).toLocaleDateString("ko-KR")
                        : "날짜 없음"}
                    </p>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300">{review.text || "내용 없음"}</p>
                {review.productId && (
                  <p className="text-xs text-gray-400 mt-2">상품 ID: {review.productId}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

