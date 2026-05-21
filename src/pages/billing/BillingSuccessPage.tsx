/**
 * Stripe Checkout(팀 구독) 성공 랜딩.
 * — `success_url`: `/billing/success?teamId=...&session_id=...` (Stripe가 session_id 치환)
 * — Toss 카드 등록 완료는 `/team/:teamId/billing/success` (TeamBillingSuccessPage) 사용.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { Check } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db, functions } from "@/lib/firebase";
import type { HubTeamPlanId } from "@/types/teamBilling";
import { normalizeHubTeamPlan } from "@/lib/billing/hubTeamPlanGates";

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teamId = searchParams.get("teamId");
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<HubTeamPlanId | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!teamId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        if (sessionId) {
          const verify = httpsCallable(functions, "verifyCheckoutSession");
          const res = await verify({ session_id: sessionId, teamId });
          const data = res.data as { verified?: boolean };
          if (!data?.verified) {
            throw new Error("verifyCheckoutSession: not verified");
          }
          if (!cancelled) {
            toast.success("업그레이드가 완료되었습니다");
          }
        }

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        if (sessionId) {
          for (let i = 0; i < 8 && !cancelled; i++) {
            const teamDoc = await getDoc(doc(db, "teams", teamId));
            if (teamDoc.exists()) {
              const p = normalizeHubTeamPlan(teamDoc.data()?.plan);
              setPlan(p);
              if (p === "pro" || p === "basic" || p === "team_plus") {
                break;
              }
            }
            if (i < 7) {
              await sleep(500);
            }
          }
        } else {
          const teamDoc = await getDoc(doc(db, "teams", teamId));
          if (!cancelled && teamDoc.exists()) {
            setPlan(normalizeHubTeamPlan(teamDoc.data()?.plan));
          }
        }
      } catch (e) {
        console.error("[BillingSuccessPage] 확인 또는 팀 조회 실패:", e);
        if (sessionId && !cancelled) {
          toast.error("결제 확인에 실패했습니다. 팀 홈에서 플랜 상태를 확인해 주세요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      await new Promise((r) => setTimeout(r, 1600));
      if (!cancelled) {
        navigate(`/team/${encodeURIComponent(teamId)}?tab=home`, { replace: true });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [teamId, sessionId, navigate]);

  if (!teamId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">결제 완료 처리 중...</p>
        </div>
      </div>
    );
  }

  const isProish = plan === "pro" || plan === "team_plus";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">결제가 완료되었습니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isProish ? (
            <>
              <strong className="text-blue-600">Pro</strong> 요금제가 반영되었습니다.
              <br />
              잠시 후 팀 홈으로 이동합니다.
            </>
          ) : plan === "basic" ? (
            <>
              <strong className="text-blue-600">Basic</strong> 요금제가 반영되었습니다.
              <br />
              잠시 후 팀 홈으로 이동합니다.
            </>
          ) : (
            "플랜 정보를 불러오는 중입니다. 잠시 후 팀 홈으로 이동합니다."
          )}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/team/${encodeURIComponent(teamId)}?tab=home`, { replace: true })}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          팀 홈으로 이동
        </button>
      </div>
    </div>
  );
}
