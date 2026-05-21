/**
 * 🔥 Map Ground Card - 지도 구장 카드 UI
 * 
 * 44px 터치, 가격/다음 슬롯, 예약 CTA
 */

import { useNavigate } from "react-router-dom";
import type { GroundMapView } from "../domain/superapp.types";
import { openDirection, openMapView } from "../utils/map.integration";
import { logEvent } from "../utils/analytics.logger";
import type { Region } from "../domain/region.types";

interface MapGroundCardProps {
  ground: GroundMapView;
  onReserve?: (groundId: string) => void;
}

export function MapGroundCard({ ground, onReserve }: MapGroundCardProps) {
  const navigate = useNavigate();

  const handleDirection = () => {
    openDirection(ground, "kakao");
    logEvent(
      {
        eventName: "direction_click",
        metadata: { groundId: ground.id },
      },
      { region: ground.region }
    );
  };

  const handleMapView = () => {
    openMapView(ground, navigate);
    logEvent(
      {
        eventName: "map_view",
        metadata: { groundId: ground.id },
      },
      { region: ground.region }
    );
  };

  const handleReserve = () => {
    if (onReserve) {
      onReserve(ground.id);
    } else {
      navigate(`/r/${ground.region}/ground/${ground.id}/reserve`);
    }
    logEvent(
      {
        eventName: "slot_select",
        metadata: { groundId: ground.id },
      },
      { region: ground.region }
    );
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{ground.name}</h3>
          <p className="text-sm text-gray-600">{ground.address}</p>
        </div>
        {ground.rating > 0 && (
          <div className="text-sm font-medium">
            ⭐ {ground.rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-lg font-bold text-emerald-600">
            {ground.priceFrom.toLocaleString()}원
          </span>
          <span className="text-sm text-gray-500 ml-1">부터</span>
        </div>
        {ground.nextSlot && (
          <div className="text-xs text-gray-500">
            다음: {new Date(ground.nextSlot).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDirection}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          길찾기
        </button>
        <button
          onClick={handleMapView}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          지도보기
        </button>
        <button
          onClick={handleReserve}
          className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 min-h-[44px]"
        >
          예약하기
        </button>
      </div>
    </div>
  );
}
