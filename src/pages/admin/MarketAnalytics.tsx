/**
 * 🔥 마켓 운영 대시보드 v1
 * 
 * 핵심 마켓 지표를 한 화면에서 확인
 */

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, MessageCircle, CheckCircle, DollarSign, Search } from "lucide-react";
import { getTodayMetrics, getTopSports, getTopSearchKeywords } from "@/services/marketAnalyticsService";

interface MarketMetrics {
  todayPosts: number;
  todayChats: number;
  todayCompleted: number;
  avgPrice: number;
  topSports: Array<{ sport: string; count: number }>;
  topSearchKeywords: Array<{ keyword: string; count: number }>;
}

export default function MarketAnalytics() {
  const [metrics, setMetrics] = useState<MarketMetrics>({
    todayPosts: 0,
    todayChats: 0,
    todayCompleted: 0,
    avgPrice: 0,
    topSports: [],
    topSearchKeywords: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 지표 조회 (서비스 레이어 사용)
        const [todayMetrics, topSports, topSearchKeywords] = await Promise.all([
          getTodayMetrics(),
          getTopSports(3),
          getTopSearchKeywords(5),
        ]);

        setMetrics({
          todayPosts: todayMetrics.posts,
          todayChats: todayMetrics.chats,
          todayCompleted: todayMetrics.completed,
          avgPrice: todayMetrics.avgPrice,
          topSports,
          topSearchKeywords,
        });
      } catch (err: any) {
        console.error("❌ [MarketAnalytics] 지표 조회 실패:", err);
        setError(err.message || "지표를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // 5분마다 자동 갱신
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  const sportLabels: Record<string, string> = {
    soccer: "축구",
    basketball: "농구",
    baseball: "야구",
    volleyball: "배구",
    tennis: "테니스",
    badminton: "배드민턴",
    fitness: "헬스/피트니스",
    yoga: "요가/필라테스",
    climbing: "클라이밍",
    running: "러닝",
    golf: "골프",
    etc: "기타",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔥 마켓 운영 대시보드</h1>
          <p className="text-gray-600">핵심 마켓 지표를 한 화면에서 확인</p>
        </div>

        {/* 지표 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 오늘 게시글 수 */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">오늘 게시글 수</h3>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.todayPosts}</p>
            <p className="text-xs text-gray-500 mt-1">새로 등록된 게시글</p>
          </div>

          {/* 오늘 채팅 시작 수 */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">오늘 채팅 시작 수</h3>
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.todayChats}</p>
            <p className="text-xs text-gray-500 mt-1">새로 시작된 채팅</p>
          </div>

          {/* 오늘 거래 완료 수 */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">오늘 거래 완료 수</h3>
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.todayCompleted}</p>
            <p className="text-xs text-gray-500 mt-1">완료된 거래</p>
          </div>

          {/* 평균 거래 가격 */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">평균 거래 가격</h3>
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {metrics.avgPrice > 0 ? formatPrice(metrics.avgPrice) : "-"}
            </p>
            <p className="text-xs text-gray-500 mt-1">완료된 거래 기준</p>
          </div>
        </div>

        {/* 하단 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 인기 종목 TOP3 */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">인기 종목 TOP3</h2>
            </div>
            {metrics.topSports.length > 0 ? (
              <div className="space-y-3">
                {metrics.topSports.map((item, index) => (
                  <div key={item.sport} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">
                        {sportLabels[item.sport] || item.sport}
                      </span>
                    </div>
                    <span className="text-gray-600 font-semibold">{item.count}개</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">오늘 등록된 게시글이 없습니다.</p>
            )}
          </div>

          {/* 검색어 TOP5 */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">검색어 TOP5</h2>
            </div>
            {metrics.topSearchKeywords.length > 0 ? (
              <div className="space-y-3">
                {metrics.topSearchKeywords.map((item, index) => (
                  <div key={item.keyword} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{item.keyword}</span>
                    </div>
                    <span className="text-gray-600 font-semibold">{item.count}회</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                검색어 데이터는 v2에서 analytics 이벤트 로그 기반으로 제공됩니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
