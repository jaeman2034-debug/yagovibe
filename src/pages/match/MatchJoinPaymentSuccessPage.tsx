import { httpsCallable } from "firebase/functions";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { requestMatch } from "@/services/matchService";
import { functions } from "@/lib/firebase";
import {
  clearPendingMatchJoinPayment,
  getPendingMatchJoinPayment,
} from "@/lib/match/matchJoinPaymentFlow";
import { track } from "@/lib/eventLog";

export default function MatchJoinPaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState("결제를 확인하고 참가 처리하는 중입니다...");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const orderId = params.get("orderId") || "";
    const paymentKey = params.get("paymentKey") || "";
    const amountRaw = params.get("amount") || "";
    const amount = Number(amountRaw);

    if (!orderId || !paymentKey || !Number.isFinite(amount) || amount <= 0) {
      setError("결제 확인 정보가 올바르지 않습니다.");
      return;
    }

    const pending = getPendingMatchJoinPayment(orderId);
    if (!pending) {
      setError("참가 정보가 만료되었습니다. 경기 상세에서 다시 시도해주세요.");
      return;
    }

    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: `/match/payment/success?${params.toString()}` },
      });
      return;
    }

    const doneKey = `matchJoinApplied:${orderId}`;
    if (sessionStorage.getItem(doneKey) === "1") {
      clearPendingMatchJoinPayment(orderId);
      navigate(`/match/success?matchId=${encodeURIComponent(pending.matchId)}`, { replace: true });
      return;
    }

    const run = async () => {
      try {
        const verifyPayment = httpsCallable(functions, "verifyPayment");
        await verifyPayment({ orderId, paymentKey, amount });
        void track("payment_success", {
          matchId: pending.matchId,
          amount,
          orderId,
        });

        setMessage("결제 확인 완료. 참가를 확정하고 있습니다...");
        await requestMatch(
          pending.matchId,
          pending.teamId,
          pending.teamName,
          "결제 완료 후 자동 참가",
          {
            uid: user.uid,
            displayName: user.displayName ?? user.email ?? null,
            photoURL: user.photoURL ?? null,
          }
        );
        void track("match_join_complete", {
          matchId: pending.matchId,
          amount,
          orderId,
        });

        sessionStorage.setItem(doneKey, "1");
        clearPendingMatchJoinPayment(orderId);
        navigate(`/match/success?matchId=${encodeURIComponent(pending.matchId)}`, {
          replace: true,
        });
      } catch (e) {
        console.error(e);
        setError("결제는 완료됐지만 참가 처리에 실패했습니다. 운영팀에 문의해주세요.");
        toast.error("참가 처리 실패");
      }
    };
    void run();
  }, [navigate, params, user]);

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-[480px] rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-700">결제 처리 오류</h1>
            <p className="mt-3 text-sm text-gray-600">{error}</p>
            <button
              type="button"
              className="mt-6 h-11 w-full rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800"
              onClick={() => navigate("/sports/match")}
            >
              경기 목록으로 이동
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900">결제 확인 중</h1>
            <p className="mt-3 text-sm text-gray-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

