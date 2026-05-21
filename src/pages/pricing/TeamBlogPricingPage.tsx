// src/pages/pricing/TeamBlogPricingPage.tsx
// 🔥 팀 블로그 유료 전환 페이지 (결제 테스트 가능 수준)

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { X, Check, Sparkles, Zap, Calendar, BarChart3, Image, Share2, Palette, Crown } from "lucide-react";
import { track } from "@/lib/analytics";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

interface Props {
  onClose?: () => void;
  trigger?: "blog_tab" | "second_post" | "view_count" | "manual";
}

export default function TeamBlogPricingPage({ onClose, trigger = "manual" }: Props) {
  const navigate = useNavigate();
  const { myTeam, plan, role } = useTeam();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const [searchParams] = useSearchParams();
  const triggerFromUrl = searchParams.get("trigger") || trigger;

  // 🔥 페이지 진입 추적
  useEffect(() => {
    track("team_blog_pricing_view", {
      teamId: myTeam?.id,
      currentPlan: plan,
      trigger: triggerFromUrl,
    });
  }, [myTeam?.id, plan, triggerFromUrl]);

  // 🔥 관리자 권한 체크
  const normalizedRole = (role || "").toLowerCase();
  const isAdmin = normalizedRole === "admin" || normalizedRole === "관리자" || normalizedRole === "owner" || normalizedRole === "manager" || normalizedRole === "총무";

  // 이미 Pro 플랜인 경우
  if (plan === "pro" || plan === "TEAM_PRO") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">이미 Pro 플랜을 사용 중입니다</h2>
          <p className="text-gray-600 mb-6">
            팀 블로그의 모든 기능을 자유롭게 사용하실 수 있습니다.
          </p>
          <button
            onClick={() => (onClose ? onClose() : navigate(-1))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  // 관리자가 아닌 경우
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">관리자만 업그레이드할 수 있습니다</h2>
          <p className="text-gray-600 mb-6">
            팀 관리자 또는 총무 권한이 필요합니다.
          </p>
          <button
            onClick={() => (onClose ? onClose() : navigate(-1))}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  // 🔥 결제 처리 (실제 Stripe 연동)
  const handleSubscribe = async () => {
    if (!myTeam?.id || !user?.uid) {
      alert("팀 정보를 불러올 수 없습니다.");
      return;
    }

    try {
      setProcessing(true);
      track("checkout_started", {
        teamId: myTeam.id,
        plan: "TEAM_PRO",
        price: 19000,
      });

      // Stripe Checkout 세션 생성
      const createSession = httpsCallable(functions, "createCheckoutSession");
      const res = await createSession({ teamId: myTeam.id, interval: "month" });

      const url = (res.data as any)?.url;
      if (!url) {
        throw new Error("결제 URL을 가져오지 못했습니다.");
      }

      // Stripe Checkout으로 이동
      window.location.href = url as string;
    } catch (error: any) {
      console.error("결제 처리 실패:", error);
      alert(`결제 처리 중 오류가 발생했습니다: ${error.message || "잠시 후 다시 시도해주세요."}`);
      track("checkout_failed", {
        teamId: myTeam?.id,
        message: error?.message,
      });
      setProcessing(false);
    }
  };

  // 🔥 닫기 처리 (플랜 B)
  const handleClose = () => {
    track("team_blog_pricing_close", {
      teamId: myTeam?.id,
      trigger,
    });

    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모달 오버레이 */}
      {onClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleClose} />
      )}

      <div className={`${onClose ? "fixed inset-0 z-50 flex items-center justify-center p-4" : "container mx-auto px-4 py-8"}`}>
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={28} />
                AI 팀 블로그 Pro
              </h1>
              <p className="text-gray-600 mt-1">팀 홍보, 이제 AI가 대신합니다</p>
            </div>
            {onClose && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* 히어로 섹션 */}
          <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                팀 홍보, 이제 AI가 대신합니다
              </h2>
              <p className="text-lg text-gray-700 mb-2">
                글 쓰고, 공지 올리고, 관리하느라
              </p>
              <p className="text-lg text-gray-700 font-medium">
                더 이상 시간 쓰지 마세요.
              </p>
            </div>
          </div>

          {/* 이미 느낀 가치 리마인드 */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Check className="text-green-600" size={24} />
              <h3 className="text-xl font-semibold text-gray-900">이미 이런 일은 하고 있습니다</h3>
            </div>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start gap-3">
                <Check className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium">팀 소개 글 자동 생성됨</p>
                  <p className="text-sm text-gray-500">AI가 팀을 소개하는 첫 글을 자동으로 작성했습니다</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium">최근 활동 후기 자동 발행됨</p>
                  <p className="text-sm text-gray-500">일정만 등록하면 활동 후기가 자동으로 올라갑니다</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium">블로그 공개 페이지 운영 중</p>
                  <p className="text-sm text-gray-500">검색·공유 가능한 팀 블로그가 이미 만들어져 있습니다</p>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>📌 중요:</strong> 당신은 이미 무료로 써봤습니다. 결제는 업그레이드이지 시작이 아닙니다.
              </p>
            </div>
          </div>

          {/* Pro 기능 설명 */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <Crown className="text-yellow-600" size={24} />
              <h3 className="text-xl font-semibold text-gray-900">Pro로 열리는 기능</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">주간 팀 요약 자동 생성</p>
                  <p className="text-sm text-gray-600">매주 일요일 밤, 이번 주 활동을 한눈에 정리한 리포트가 자동 발행됩니다</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <BarChart3 className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">월간 성과 리포트</p>
                  <p className="text-sm text-gray-600">매월 말, 팀의 활동 통계와 성과를 요약한 리포트가 자동 생성됩니다</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Zap className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">활동 후기 무제한</p>
                  <p className="text-sm text-gray-600">월 2회 제한 없이, 활동할 때마다 자동으로 후기가 올라갑니다</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Image className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">사진 설명 + SNS 공유</p>
                  <p className="text-sm text-gray-600">사진만 올리면 AI가 장면을 설명하고, SNS 공유용 요약도 자동 생성합니다</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg md:col-span-2">
                <Palette className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">글 톤 선택 + YAGO 브랜딩 제거</p>
                  <p className="text-sm text-gray-600">친근/진지/유머 톤 선택 가능, 블로그에서 YAGO 배지 제거 (Powered by YAGO AI만 노출)</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-red-600 font-bold">❌ Before</span>
              </div>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li>• 글 쓸 사람 없음</li>
                <li>• 매번 공지 귀찮음</li>
                <li>• 블로그 방치</li>
              </ul>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✅ After (Pro)</span>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 주간 요약 자동 생성</li>
                <li>• 활동 후기는 무제한</li>
                <li>• 사진만 올리면 글 완성</li>
                <li>• SNS 공유 자동화</li>
              </ul>
            </div>
          </div>

          {/* 가격 영역 */}
          <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
            <div className="text-center max-w-2xl mx-auto">
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">월 19,000원</span>
                <span className="text-gray-600 ml-2">/ 팀</span>
              </div>
              <p className="text-gray-600 mb-2">
                연간 결제 시 <strong className="text-gray-900">월 15,000원</strong> (12개월 일괄 결제)
              </p>
              <p className="text-sm text-gray-500 mb-6">
                커피 한 잔 값으로 팀 홍보를 AI에게 맡기세요.
              </p>

              <div className="flex items-center justify-center gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="text-green-600" size={16} />
                  <span>언제든 해지 가능</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="text-green-600" size={16} />
                  <span>카드 1번 등록</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="text-green-600" size={16} />
                  <span>숨겨진 비용 없음</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA 버튼 */}
          <div className="p-8 text-center">
            <button
              onClick={handleSubscribe}
              disabled={processing}
              className="w-full max-w-md px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  처리 중...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Pro 시작하기
                </>
              )}
            </button>

            {/* 결제 직전 마지막 한 줄 */}
            <p className="text-sm text-gray-600 mt-4">
              지금 업그레이드하면 다음 주 팀 요약이 자동으로 생성됩니다.
            </p>

            {/* 전환 실패 시 플랜 B */}
            {onClose && (
              <button
                onClick={handleClose}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                괜찮아요 🙂 다음 자동 글이 생성될 때 다시 알려드릴게요.
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

