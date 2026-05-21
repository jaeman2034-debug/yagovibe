/**
 * 🔥 오늘 용병 섹션 (홈 화면)
 * 
 * 역할:
 * - 오늘 날짜의 guest_players 표시
 * - 시간순 정렬
 * - [지원하기] 버튼
 */

import { useGuests } from "@/hooks/useGuests";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TodayGuestSection() {
  const navigate = useNavigate();
  const today = new Date();
  const { guests, loading } = useGuests({
    status: "open",
    date: today,
    limit: 5,
  });

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 오늘 용병</h2>
        </div>
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </section>
    );
  }

  if (guests.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 오늘 용병</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/guest/create")}
          >
            용병 모집하기
          </Button>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          오늘 용병 모집이 없습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🔥 오늘 용병</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/guest")}
        >
          전체 보기
        </Button>
      </div>
      <div className="space-y-3">
        {guests.map((guest) => {
          const date = guest.date?.toDate?.() || new Date();
          const timeStr = guest.time || "";
          const positionStr = Array.isArray(guest.position) 
            ? guest.position.join(", ") 
            : guest.position || "";

          return (
            <div
              key={guest.id}
              onClick={() => navigate(`/guest/${guest.id}`)}
              className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">
                      {timeStr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {guest.stadium ? `${guest.region} · ${guest.stadium}` : guest.region}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {positionStr} {guest.slots}명
                    </span>
                  </div>
                  {guest.fee && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        참가비 {guest.fee.toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/guest/${guest.id}`);
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
