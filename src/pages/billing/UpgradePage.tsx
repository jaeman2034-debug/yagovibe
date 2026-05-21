/**
 * 🔥 UpgradePage - Pro 업그레이드 페이지
 * 
 * UX 원칙:
 * - "이 기능은 Pro 전용입니다" 명확하게
 * - "왜 필요한지" 한 줄
 * - Upgrade 버튼 하나
 * - 즉시성 강조
 */

import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Check, Lock } from "lucide-react";

export default function UpgradePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from"); // 어디서 왔는지 (fees, audit, etc.)
  const { myTeam, plan, refreshTeam } = useTeam();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Pro 전용 기능 설명
  const getFeatureName = () => {
    switch (from) {
      case "fees":
        return "회비 결제 링크 생성";
      case "audit":
        return "감사 로그 보기";
      case "attendance":
        return "출석 통계 보기";
      default:
        return "Pro 기능";
    }
  };

  const handleUpgrade = async () => {
    if (!teamId || !user) return;

    try {
      setLoading(true);

      // 🔥 Stripe Checkout 세션 생성
      const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
      const result = await createCheckoutSession({
        teamId,
        interval: "month", // 또는 "year"
      });

      const { url } = result.data as { url: string };

      if (url) {
        // Stripe Checkout 페이지로 이동
        window.location.href = url;
      } else {
        throw new Error("결제 링크를 생성할 수 없습니다.");
      }
    } catch (error: any) {
      console.error("❌ [UpgradePage] 업그레이드 실패:", error);
      alert(error.message || "업그레이드 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  if (plan === "pro") {
    // 이미 Pro인 경우
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            이미 Pro 플랜입니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            모든 Pro 기능을 사용할 수 있습니다.
          </p>
          <button
            onClick={() => navigate(`/t/${teamId}`)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pro 업그레이드 필요
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            <strong className="text-blue-600">{getFeatureName()}</strong>은 Pro 전용 기능입니다
          </p>
        </div>

        {/* 현재 플랜 vs Pro 플랜 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">현재 플랜</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">Free</div>
            </div>
            <div className="text-center p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">업그레이드 후</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Pro</div>
            </div>
          </div>

          {/* Pro 기능 목록 */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">미납자 자동 알림</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">회비 미납자에게 자동으로 알림을 보냅니다</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">회비 결제 링크 생성</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">팀원들에게 개별 결제 링크를 생성합니다</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">출석 통계 보기</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">팀원별 출석률 및 통계를 확인합니다</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">관리자 2명 이상</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">팀에 2명 이상의 관리자를 지정할 수 있습니다</div>
              </div>
            </div>
          </div>

          {/* 가격 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">월 요금</div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              29,000<span className="text-lg font-normal">원</span>
            </div>
            <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
              지금 업그레이드하면 바로 적용됩니다
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/t/${teamId}`)}
            className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
          >
            나중에
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "처리 중..." : "Pro로 업그레이드"}
          </button>
        </div>
      </div>
    </div>
  );
}
