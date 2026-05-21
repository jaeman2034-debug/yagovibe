/**
 * 🔥 BillingCard - 결제 상태 카드
 * 
 * 표시:
 * - 현재 플랜
 * - 업그레이드 일시
 * - 결제 수단 (있다면)
 * - 다음 결제일 (subscription일 때)
 * 
 * 액션:
 * - Free → Pro 업그레이드
 * - Pro 상태 표시
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeam } from "@/context/TeamContext";
import { CreditCard, Calendar, ArrowUpCircle } from "lucide-react";

interface BillingInfo {
  plan: "free" | "pro" | "academy_pro";
  subscriptionStatus?: string;
  currentPeriodEnd?: Date;
  stripeCustomerId?: string;
  upgradedAt?: Date;
}

export function BillingCard({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const { plan: currentPlan } = useTeam();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        // 1. 팀 정보 조회
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        if (!teamDoc.exists()) {
          setLoading(false);
          return;
        }

        const teamData = teamDoc.data();
        const plan = (teamData.plan as "free" | "pro" | "academy_pro") || "free";

        // 2. 구독 정보 조회
        let subscriptionStatus: string | undefined;
        let currentPeriodEnd: Date | undefined;
        let stripeCustomerId: string | undefined;
        let upgradedAt: Date | undefined;

        try {
          const subDoc = await getDoc(doc(db, `teams/${teamId}/subscription/current`));
          if (subDoc.exists()) {
            const subData = subDoc.data();
            subscriptionStatus = subData.status;
            stripeCustomerId = subData.stripeCustomerId;
            
            if (subData.currentPeriodEnd) {
              currentPeriodEnd = subData.currentPeriodEnd.toDate?.() || new Date(subData.currentPeriodEnd);
            }
            
            if (subData.updatedAt) {
              upgradedAt = subData.updatedAt.toDate?.() || new Date(subData.updatedAt);
            }
          }
        } catch (err) {
          console.warn("⚠️ 구독 정보 조회 실패:", err);
        }

        setBilling({
          plan,
          subscriptionStatus,
          currentPeriodEnd,
          stripeCustomerId,
          upgradedAt,
        });
      } catch (error) {
        console.error("❌ [BillingCard] 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, [teamId]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "-";
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">결제 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const isPro = billing.plan === "pro" || billing.plan === "academy_pro";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        결제 상태
      </h2>

      <div className="space-y-4">
        {/* 현재 플랜 */}
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">현재 플랜</div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${
              isPro 
                ? "text-purple-600 dark:text-purple-400"
                : "text-gray-900 dark:text-white"
            }`}>
              {billing.plan === "pro" ? "Pro" : billing.plan === "academy_pro" ? "Academy Pro" : "Free"}
            </div>
            {billing.subscriptionStatus && (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                billing.subscriptionStatus === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : billing.subscriptionStatus === "past_due"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              }`}>
                {billing.subscriptionStatus === "active" ? "활성" : 
                 billing.subscriptionStatus === "past_due" ? "미납" : "중지"}
              </span>
            )}
          </div>
        </div>

        {/* 업그레이드 일시 */}
        {billing.upgradedAt && (
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">업그레이드 일시</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Calendar className="w-4 h-4" />
              {formatDate(billing.upgradedAt)}
            </div>
          </div>
        )}

        {/* 다음 결제일 */}
        {billing.currentPeriodEnd && (
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">다음 결제일</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Calendar className="w-4 h-4" />
              {formatDate(billing.currentPeriodEnd)}
            </div>
          </div>
        )}

        {/* 결제 수단 */}
        {billing.stripeCustomerId && (
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">결제 수단</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <CreditCard className="w-4 h-4" />
              Stripe로 등록됨
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          {!isPro ? (
            <button
              onClick={() => navigate(`/t/${teamId}/upgrade`)}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
            >
              <ArrowUpCircle className="w-5 h-5" />
              Pro로 업그레이드
            </button>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Pro 플랜이 활성화되어 있습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
