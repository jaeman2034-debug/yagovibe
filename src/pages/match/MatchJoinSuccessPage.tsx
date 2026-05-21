import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function MatchJoinSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const matchId = params.get("matchId");

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-[480px] rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">🎉 참가 완료!</h1>
        <p className="mt-3 text-sm text-gray-600">경기에서 만나요 👋</p>
        <div className="mt-6 space-y-2">
          {matchId ? (
            <Button className="h-11 w-full" onClick={() => navigate(`/match/${matchId}`)}>
              경기 상세로 돌아가기
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => navigate("/sports/match")}
          >
            경기 목록으로 가기
          </Button>
        </div>
      </div>
    </div>
  );
}
