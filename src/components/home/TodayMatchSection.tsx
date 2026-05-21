/**
 * 🔥 오늘 경기 매칭 섹션 (홈 화면)
 * 
 * 역할:
 * - 오늘 날짜의 matches 표시
 * - 시간순 정렬
 * - [신청하기] 버튼
 */

import { useMatches } from "@/hooks/useMatches";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Trophy, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TodayMatchSection() {
  const navigate = useNavigate();
  const today = new Date();
  const { matches, loading } = useMatches({
    status: "open",
    date: today,
    limit: 5,
  });

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 오늘 경기</h2>
        </div>
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </section>
    );
  }

  if (matches.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 오늘 경기</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sports/soccer/match/create")}
          >
            매칭 등록하기
          </Button>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          오늘 경기 매칭이 없습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🔥 오늘 경기</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/match")}
        >
          전체 보기
        </Button>
      </div>
      <div className="space-y-3">
        {matches.map((match) => {
          const date = match.date?.toDate?.() || new Date();
          const timeStr = match.time || "";

          return (
            <div
              key={match.id}
              onClick={() => navigate(`/match/${match.id}`)}
              className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-gray-900">
                      {match.teamName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {timeStr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {match.stadium ? `${match.region} · ${match.stadium}` : match.region}
                    </span>
                  </div>
                  {match.fee && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        참가비 {match.fee.toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/match/${match.id}`);
                  }}
                >
                  신청하기
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
