// src/components/team/AdminPerformanceReport.tsx
// 📈 팀 블로그 관리자용 성과 리포트 UI

import { useEffect, useState } from "react";
import { trackTeamBlogLanding } from "@/lib/analytics";
import { TrendingUp, TrendingDown, Users, MousePointerClick, UserPlus, Eye } from "lucide-react";

interface AdminPerformanceReportProps {
  teamId: string;
  teamSlug: string;
  period?: "7d" | "30d";
}

interface Metrics {
  visitors: number;
  visitorsChange: number; // 전주 대비 변화율 (%)
  ctaClicks: number;
  ctaClickRate: number; // CTR (%)
  joinAttempts: number;
  joinConversionRate: number; // 전환율 (%)
  blogViews: number;
  blogContribution: number; // 가입 기여도 (%)
}

interface Insights {
  trafficQuality: {
    percentage: number;
    description: string;
  };
  conversionContribution: {
    percentage: number;
    description: string;
  };
  opportunityLoss: {
    enabled: boolean;
    estimatedLoss: number;
    description: string;
  };
}

export default function AdminPerformanceReport({
  teamId,
  teamSlug,
  period = "7d",
}: AdminPerformanceReportProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Analytics API에서 데이터 조회
    // 임시 더미 데이터
    const fetchMetrics = async () => {
      setLoading(true);
      // 실제로는 Analytics API 호출
      setTimeout(() => {
        setMetrics({
          visitors: 42,
          visitorsChange: 18,
          ctaClicks: 11,
          ctaClickRate: 26,
          joinAttempts: 5,
          joinConversionRate: 12,
          blogViews: 67,
          blogContribution: 40,
        });
        setInsights({
          trafficQuality: {
            percentage: 64,
            description: "콘텐츠가 신뢰를 만들고 있어요.",
          },
          conversionContribution: {
            percentage: 73,
            description: "지금 구조가 잘 작동하고 있어요.",
          },
          opportunityLoss: {
            enabled: true,
            estimatedLoss: 18,
            description: "이 기간에 약 15~20명의 추가 방문 기회가 있었어요.",
          },
        });
        setLoading(false);
      }, 500);
    };

    fetchMetrics();
  }, [teamId, period]);

  // Pro 전환 기회 표시 조건
  const showProOpportunity =
    metrics && (metrics.visitors >= 30 || metrics.ctaClicks >= 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metrics || !conversionRates) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 상단 요약 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          📊 지난 7일, 팀 페이지가 이렇게 작동했습니다
        </h2>
        <p className="text-sm text-gray-600">
          실제 방문·클릭 데이터를 기준으로 요약했어요.
        </p>
      </div>

      {/* KPI 카드 4종 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 방문자 */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-600">
              <Users size={20} />
              <span className="text-sm font-medium">방문자</span>
            </div>
            {metrics.visitorsChange > 0 ? (
              <div className="flex items-center gap-1 text-green-600 text-xs">
                <TrendingUp size={14} />
                <span>+{metrics.visitorsChange}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <TrendingDown size={14} />
                <span>{metrics.visitorsChange}%</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{metrics.visitors}명</p>
          <p className="text-xs text-gray-500">전주 대비</p>
        </div>

        {/* CTA 클릭 */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MousePointerClick size={20} />
            <span className="text-sm font-medium">CTA 클릭</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{metrics.ctaClicks}회</p>
          <p className="text-xs text-gray-500">CTR {metrics.ctaClickRate}%</p>
        </div>

        {/* 가입 시도 */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <UserPlus size={20} />
            <span className="text-sm font-medium">가입 시도</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{metrics.joinAttempts}명</p>
          <p className="text-xs text-gray-500">전환율 {metrics.joinConversionRate}%</p>
        </div>

        {/* 블로그 기여 */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Eye size={20} />
            <span className="text-sm font-medium">블로그 기여</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{metrics.blogViews} 조회</p>
          <p className="text-xs text-gray-500">가입 기여 {metrics.blogContribution}%</p>
        </div>
      </div>

      {/* 인사이트 카드 3종 */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 카드 A: 유입 품질 */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-sm text-gray-700 mb-2">
              방문자의 <strong className="text-gray-900">{insights.trafficQuality.percentage}%</strong>가
              <br />
              블로그 또는 최근 활동을 보고 들어왔어요.
            </p>
            <p className="text-xs text-gray-500 italic">
              "{insights.trafficQuality.description}"
            </p>
          </div>

          {/* 카드 B: 전환 기여 */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
            <div className="text-2xl mb-2">👉</div>
            <p className="text-sm text-gray-700 mb-2">
              CTA 클릭의 <strong className="text-gray-900">{insights.conversionContribution.percentage}%</strong>가
              <br />
              히어로 + 전환 구간 2에서 발생했어요.
            </p>
            <p className="text-xs text-gray-500 italic">
              "{insights.conversionContribution.description}"
            </p>
          </div>

          {/* 카드 C: 기회 손실 (Pro 트리거) */}
          {insights.opportunityLoss.enabled && (
            <div className="bg-yellow-50 rounded-xl shadow-sm p-5 border border-yellow-200">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="text-sm text-gray-700 mb-2">
                최근 7일간
                <br />
                자동 홍보/글 생성이 비활성화되어 있었어요.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {insights.opportunityLoss.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pro 전환 블록 (조건부) */}
      {showProOpportunity && metrics && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            📈 지금 흐름을 유지하면
          </h3>
          <p className="text-gray-700 mb-4">
            다음 7일에도 비슷한 성과가 예상돼요.
            <br />
            <br />
            Pro를 사용하면
            <br />
            이 흐름을 자동으로 확장할 수 있어요.
          </p>

          {/* Pro 혜택 (숫자 중심) */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Pro 혜택</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>자동 팀 홍보 게시: 주 2회</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>AI 블로그 생성: 월 4회</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>방문/전환 리포트 자동 요약</span>
              </li>
            </ul>
          </div>

          {/* CTA 영역 */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  trackTeamBlogLanding.clickProUpgrade({
                    teamId,
                    teamSlug,
                    plan: "pro",
                    from: "admin_notice",
                    last7dVisitors: metrics.visitors,
                    device: window.innerWidth < 768 ? "mobile" : "web",
                  });
                  // Pro 결제 페이지로 이동
                  window.location.href = `/sports/football/team/${teamId}?upgrade=pro`;
                }}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-md"
              >
                🚀 Pro 계속 사용하기
              </button>
              <button
                onClick={() => {
                  // Pro 기능 상세 페이지
                  alert("Pro 기능 상세 페이지는 준비 중입니다.");
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium"
              >
                기능 더 알아보기
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">
              언제든지 해지할 수 있어요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

