/**
 * 🎨 ArrivalPanel 컴포넌트
 * 
 * Figma: ArrivalPanel
 * 도착 화면 (지도 사라지고 컨텍스트 전환)
 */

import { useNavigate, useLocation } from "react-router-dom";

interface ArrivalPanelProps {
  destinationName: string;
  crewId?: string;
  onClose: () => void;
}

export function ArrivalPanel({ destinationName, crewId, onClose }: ArrivalPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handlePrimaryAction = () => {
    if (crewId) {
      navigate(`/running-crew/${crewId}`);
    } else {
      if (!location.pathname.startsWith("/sports")) {
        console.log("🔥 NAVIGATE HOME TRIGGERED [ArrivalPanel:primary-action]", location.pathname);
      navigate("/home");
      }
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-6 max-w-md">
          <p className="text-3xl font-bold text-gray-900">🎉 도착했어요</p>
          <p className="text-lg text-gray-700">{destinationName}</p>
          <div className="space-y-3 pt-4">
            <button
              onClick={handlePrimaryAction}
              className="w-full rounded-full bg-blue-600 px-6 py-3 text-white font-medium active:scale-95 transition-transform shadow-lg hover:bg-blue-700"
            >
              {crewId ? "러닝 크루 입장" : "다음 활동 시작"}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-full bg-gray-100 px-6 py-3 text-gray-700 font-medium active:scale-95 transition-transform hover:bg-gray-200"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
