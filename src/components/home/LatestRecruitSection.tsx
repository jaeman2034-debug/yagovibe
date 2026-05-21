/**
 * 🔥 최신 팀원 모집 섹션 (홈 화면)
 * 
 * 역할:
 * - 최근 3일 내 recruits 표시
 * - 최신순 정렬
 * - [지원하기] 버튼
 */

import { useRecruits } from "@/hooks/useRecruits";
import { useNavigate } from "react-router-dom";
import { sportMarketListUrl } from "@/utils/sportHubHref";
import { Users, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LatestRecruitSection() {
  const navigate = useNavigate();
  const { recruits, loading } = useRecruits({
    status: "open",
    limit: 5,
  });

  // 최근 3일 내 모집만 필터링
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const recentRecruits = recruits.filter((recruit) => {
    const createdAt = recruit.createdAt?.toDate?.() || new Date();
    return createdAt >= threeDaysAgo;
  });

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 최신 모집</h2>
        </div>
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </section>
    );
  }

  if (recentRecruits.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 최신 모집</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sports/soccer/recruit/create")}
          >
            모집하기
          </Button>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          최근 모집이 없습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🔥 최신 모집</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(sportMarketListUrl("soccer", { category: "recruit" }))}
        >
          전체 보기
        </Button>
      </div>
      <div className="space-y-3">
        {recentRecruits.map((recruit) => {
          const positionStr = Array.isArray(recruit.position)
            ? recruit.position.join(", ")
            : recruit.position || "";
          const thumb =
            Array.isArray(recruit.imageUrls) && recruit.imageUrls.length > 0
              ? recruit.imageUrls[0]
              : null;

          return (
            <div
              key={recruit.id}
              onClick={() => navigate(`/recruit/${recruit.id}`)}
              className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                {thumb ? (
                  <div className="shrink-0">
                    <img
                      src={thumb}
                      alt=""
                      className="h-20 w-20 rounded-lg object-cover border border-gray-100"
                    />
                  </div>
                ) : null}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-gray-900">
                      {recruit.teamName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-700">
                      포지션: {positionStr}
                    </span>
                    <span className="text-sm text-gray-500">
                      · {recruit.slots}명 모집
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {recruit.region}
                    </span>
                  </div>
                  {recruit.trainingDays && recruit.trainingDays.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        훈련: {Array.isArray(recruit.trainingDays) ? recruit.trainingDays.join(", ") : recruit.trainingDays}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/recruit/${recruit.id}`);
                  }}
                >
                  지원하기
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
