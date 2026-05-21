import { useNavigate, useSearchParams } from "react-router-dom";

export default function MatchJoinPaymentFailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const matchId = params.get("matchId") || "";
  const code = (params.get("code") || "").toUpperCase();
  const rawMessage = params.get("message") || "";

  const failureGuide = (() => {
    if (code.includes("CANCELED")) {
      return "결제를 취소했어요. 원하면 바로 다시 결제할 수 있어요.";
    }
    if (
      code.includes("INSUFFICIENT") ||
      code.includes("NOT_ENOUGH") ||
      code.includes("LIMIT")
    ) {
      return "한도/잔액 문제로 결제가 실패했어요. 다른 결제수단을 시도해 주세요.";
    }
    if (code.includes("NETWORK") || code.includes("TIMEOUT")) {
      return "네트워크 문제로 결제가 완료되지 않았어요. 잠시 후 다시 시도해 주세요.";
    }
    return rawMessage || "결제가 취소되었거나 실패했습니다.";
  })();

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-[480px] rounded-2xl border border-red-100 bg-white px-6 py-10 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-red-700">결제가 완료되지 않았어요</h1>
        <p className="mt-3 text-sm text-gray-600">{failureGuide}</p>
        <div className="mt-6 space-y-2">
          {matchId ? (
            <button
              type="button"
              className="h-11 w-full rounded-lg bg-gray-900 text-sm font-semibold text-white"
              onClick={() => navigate(`/match/${encodeURIComponent(matchId)}`)}
            >
              다시 결제 시도
            </button>
          ) : null}
          <button
            type="button"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800"
            onClick={() => navigate("/sports/match")}
          >
            경기 목록으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}

